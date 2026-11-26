import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// Tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfkW7gfKGnjqf7eyvyzKIfOpKHFOGpc-A",
  authDomain: "pastillerow.firebaseapp.com",
  databaseURL: "https://pastillerow-default-rtdb.firebaseio.com",
  projectId: "pastillerow",
  storageBucket: "pastillerow.firebasestorage.app",
  messagingSenderId: "304503249724",
  appId: "1:304503249724:web:05d3273ec977b218889c39"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let usuarioActual = null;
let dispositivoActivo = "";

// Navegación entre vistas
window.mostrarVista = (vista) => {
  ["tienda", "config", "mantencion"].forEach((v) => {
    document.getElementById(`vista-${v}`).classList.add("hidden");
    const btn = document.getElementById(`btn-${v}`);
    btn.classList.remove("bg-teal-600", "text-white");
    btn.classList.add("text-slate-600");
  });
  document.getElementById(`vista-${vista}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`btn-${vista}`);
  activeBtn.classList.add("bg-teal-600", "text-white");
  activeBtn.classList.remove("text-slate-600");
};

// Autenticación
window.registrarUsuario = async () => {
  const email = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    document.getElementById("auth-msg").innerText = "Error: " + e.message;
  }
};

window.iniciarSesion = async () => {
  const email = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-pass").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    document.getElementById("auth-msg").innerText = "Error: " + e.message;
  }
};

window.cerrarSesion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  if (user) {
    document.getElementById("user-status").innerText = user.email;
    document.getElementById("auth-box").classList.add("hidden");
    document.getElementById("dashboard-box").classList.remove("hidden");
    document.getElementById("usuario-correo-label").innerText = "Cuenta: " + user.email;
    escucharMantenciones();
  } else {
    document.getElementById("user-status").innerText = "No has iniciado sesión";
    document.getElementById("auth-box").classList.remove("hidden");
    document.getElementById("dashboard-box").classList.add("hidden");
  }
});

// Módulo 1: Compras
window.abrirModalCompra = () => document.getElementById("modal-compra").classList.remove("hidden");
window.cerrarModalCompra = () => document.getElementById("modal-compra").classList.add("hidden");

window.confirmarCompra = async () => {
  const nombre = document.getElementById("compra-nombre").value.trim();
  const direccion = document.getElementById("compra-direccion").value.trim();
  const telefono = document.getElementById("compra-telefono").value.trim();

  if (!nombre || !direccion) return alert("Completa tu nombre y dirección de despacho.");

  const nuevoId = "MS-2026-" + Math.floor(1000 + Math.random() * 9000);

  await set(ref(db, `pedidos/${nuevoId}`), {
    comprador: nombre,
    direccion,
    telefono,
    monto_clp: 29990,
    uid: usuarioActual ? usuarioActual.uid : "invitado",
    fecha: new Date().toISOString()
  });

  await set(ref(db, `dispositivos/${nuevoId}/config`), {
    buzzer: true,
    sensor_ir: true,
    tiempo_rebloqueo_seg: 15
  });

  cerrarModalCompra();
  alert(`¡Pedido confirmado!\n\nEl ID de tu Pastillero Inteligente es: ${nuevoId}\nGuárdalo para configurarlo en la pestaña "Configurar Pastillero".`);
  document.getElementById("input-device-id").value = nuevoId;
  mostrarVista("config");
};

// Módulo 2: Configuración de Horarios y Hardware
window.cargarConfigDispositivo = () => {
  const id = document.getElementById("input-device-id").value.trim().toUpperCase();
  if (!id) return alert("Ingresa el ID de tu pastillero (ej. MS-2026-1234)");
  dispositivoActivo = id;

  onValue(ref(db, `dispositivos/${id}/horarios`), (snapshot) => {
    const lista = document.getElementById("lista-horarios");
    lista.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      lista.innerHTML = "<li class='text-xs text-slate-400'>Sin horarios programados aún.</li>";
      return;
    }
    Object.entries(data).forEach(([key, item]) => {
      const li = document.createElement("li");
      li.className = "flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border";
      li.innerHTML = `
        <span><strong>${item.dia}</strong> • ${item.hora} — ${item.medicamento}</span>
        <button onclick="eliminarHorario('${key}')" class="text-red-500 text-xs font-bold">Eliminar</button>
      `;
      lista.appendChild(li);
    });
  });
};

window.agregarHorario = async () => {
  if (!dispositivoActivo) return alert("Primero carga un ID de pastillero.");
  const dia = document.getElementById("toma-dia").value;
  const hora = document.getElementById("toma-hora").value;
  const medicamento = document.getElementById("toma-med").value.trim();
  if (!hora || !medicamento) return alert("Ingresa hora y nombre del fármaco.");

  const nuevoRef = push(ref(db, `dispositivos/${dispositivoActivo}/horarios`));
  await set(nuevoRef, { dia, hora, medicamento, activo: true });
  document.getElementById("toma-med").value = "";
};

window.eliminarHorario = (key) => {
  if (!dispositivoActivo) return;
  remove(ref(db, `dispositivos/${dispositivoActivo}/horarios/${key}`));
};

window.guardarParametros = async () => {
  if (!dispositivoActivo) return alert("Primero carga un ID de pastillero.");
  await set(ref(db, `dispositivos/${dispositivoActivo}/config`), {
    buzzer: document.getElementById("cfg-buzzer").checked,
    sensor_ir: document.getElementById("cfg-ir").checked,
    tiempo_rebloqueo_seg: Number(document.getElementById("cfg-tiempo").value)
  });
  alert("Parámetros actualizados en Firebase para tu pastillero.");
};

// Módulo 3: Mantención
window.enviarMantencion = async () => {
  if (!usuarioActual) return alert("Inicia sesión en 'Configurar Pastillero' para registrar mantenciones.");
  const dispositivo = document.getElementById("mant-device").value.trim().toUpperCase();
  const tipo = document.getElementById("mant-tipo").value;
  const descripcion = document.getElementById("mant-desc").value.trim();
  if (!dispositivo || !descripcion) return alert("Completa el ID del dispositivo y la descripción.");

  const ticketRef = push(ref(db, "mantenciones"));
  await set(ticketRef, {
    uid: usuarioActual.uid,
    email: usuarioActual.email,
    dispositivo,
    tipo,
    descripcion,
    estado: "Recibido",
    fecha: new Date().toLocaleDateString("es-CL")
  });

  document.getElementById("mant-desc").value = "";
  alert("Solicitud de mantención enviada correctamente.");
};

function escucharMantenciones() {
  onValue(ref(db, "mantenciones"), (snapshot) => {
    const contenedor = document.getElementById("lista-mantenciones");
    contenedor.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      contenedor.innerHTML = "<p class='text-xs text-slate-400'>No hay solicitudes registradas.</p>";
      return;
    }
    Object.values(data)
      .filter((t) => t.uid === usuarioActual?.uid)
      .forEach((t) => {
        const div = document.createElement("div");
        div.className = "p-3 rounded-lg border bg-slate-50 flex justify-between items-center";
        div.innerHTML = `
          <div>
            <p class="font-semibold text-slate-800">${t.dispositivo} — ${t.tipo}</p>
            <p class="text-xs text-slate-500">${t.descripcion} (${t.fecha})</p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">${t.estado}</span>
        `;
        contenedor.appendChild(div);
      });
  });
}