/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function horaActualStr() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function minutosDeHora(hstr) {
  const [h, m] = hstr.split(':').map(Number);
  return h * 60 + m;
}

function formatearHora(hstr) { return hstr; }

/* ---------- Almacenamiento (localStorage) ---------- */
const Store = {
  getMeds() {
    try { return JSON.parse(localStorage.getItem('medicamentos')) || []; }
    catch { return []; }
  },
  saveMeds(meds) { localStorage.setItem('medicamentos', JSON.stringify(meds)); },

  getHistorial() {
    try { return JSON.parse(localStorage.getItem('historial')) || []; }
    catch { return []; }
  },
  saveHistorial(hist) { localStorage.setItem('historial', JSON.stringify(hist)); },

  getNotificados() {
    try { return JSON.parse(localStorage.getItem('notificados_' + hoyISO())) || []; }
    catch { return []; }
  },
  addNotificado(clave) {
    const arr = Store.getNotificados();
    arr.push(clave);
    localStorage.setItem('notificados_' + hoyISO(), JSON.stringify(arr));
  }
};

/* ---------- Estado en memoria ---------- */
let meds = Store.getMeds();
let historial = Store.getHistorial();
let chequeoContexto = null; // { medId, horario } o null si es ad-hoc
let confirmacionPendiente = false; // true cuando ya se mostró una alerta y falta el 2do click

/* ---------- Navegación entre pantallas ---------- */
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('activo'));
    $$('.pantalla').forEach((p) => p.classList.remove('activa'));
    tab.classList.add('activo');
    $('#' + tab.dataset.pantalla).classList.add('activa');
    if (tab.dataset.pantalla === 'pantalla-meds') renderMeds();
    if (tab.dataset.pantalla === 'pantalla-historial') renderHistorial();
  });
});

/* ================= PANTALLA HOY ================= */

function slotsDeHoy() {
  // Devuelve todos los horarios programados para hoy, con su estado
  const slots = [];
  meds.forEach((med) => {
    (med.horarios || []).forEach((horario) => {
      const entrada = historial.find(
        (h) => h.fecha === hoyISO() && h.medId === med.id && h.horaEsperada === horario
      );
      let estado = 'pendiente';
      if (entrada) {
        estado = entrada.coincideNombre === false ? 'no-coincide' : 'tomada';
      } else if (minutosDeHora(horaActualStr()) - minutosDeHora(horario) > 30) {
        estado = 'atrasada';
      }
      slots.push({ med, horario, estado, entrada });
    });
  });
  slots.sort((a, b) => minutosDeHora(a.horario) - minutosDeHora(b.horario));
  return slots;
}

function renderProximaToma(slots) {
  const cont = $('#proxima-toma');
  const pendientes = slots.filter((s) => s.estado === 'pendiente' || s.estado === 'atrasada');
  if (pendientes.length === 0) {
    cont.className = 'tarjeta-proxima vacia';
    cont.innerHTML = meds.length === 0
      ? `<p class="eyebrow">Bienvenido/a</p><p class="nombre" style="font-size:20px;">Agregá tu primer medicamento en la pestaña "Medicamentos" para empezar con los recordatorios.</p>`
      : `<p class="eyebrow">Por ahora, nada pendiente</p><p class="nombre" style="font-size:20px;">Ya tomaste todos los remedios programados para hoy. 👏</p>`;
    return;
  }
  const proxima = pendientes[0];
  cont.className = 'tarjeta-proxima' + (proxima.estado === 'atrasada' ? ' atrasada' : '');
  cont.innerHTML = `
    <p class="eyebrow">${proxima.estado === 'atrasada' ? 'Atrasado' : 'Próxima toma'}</p>
    <p class="nombre">${escapeHtml(proxima.med.nombre)}</p>
    <p class="hora">Hora: ${proxima.horario}${proxima.med.dosis ? ' · ' + escapeHtml(proxima.med.dosis) : ''}</p>
    <button class="boton boton-en-tarjeta" id="btn-confirmar-proxima">Marcar como tomado</button>
  `;
  $('#btn-confirmar-proxima').addEventListener('click', () => abrirChequeo({ medId: proxima.med.id, horario: proxima.horario }));
}

function renderListaHoy(slots) {
  const cont = $('#lista-hoy');
  if (slots.length === 0) {
    cont.innerHTML = `<div class="vacio-lista">Todavía no hay medicamentos cargados.</div>`;
    return;
  }
  cont.innerHTML = slots.map((s) => `
    <div class="item-toma" data-med="${s.med.id}" data-horario="${s.horario}">
      <div class="info">
        <span class="nombre">${escapeHtml(s.med.nombre)}</span>
        <span class="hora">${s.horario}${s.med.dosis ? ' · ' + escapeHtml(s.med.dosis) : ''}</span>
      </div>
      <span class="estado ${s.estado}">${etiquetaEstado(s.estado)}</span>
    </div>
  `).join('');

  $$('#lista-hoy .item-toma').forEach((el) => {
    el.addEventListener('click', () => {
      const medId = el.dataset.med;
      const horario = el.dataset.horario;
      const slot = slots.find((s) => s.med.id === medId && s.horario === horario);
      if (slot.estado === 'pendiente' || slot.estado === 'atrasada') {
        abrirChequeo({ medId, horario });
      }
    });
  });
}

function etiquetaEstado(estado) {
  return { pendiente: 'Pendiente', tomada: 'Tomada', atrasada: 'Atrasada', 'no-coincide': 'Revisar' }[estado] || estado;
}

function renderHoy() {
  const slots = slotsDeHoy();
  renderProximaToma(slots);
  renderListaHoy(slots);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* ================= PANTALLA MEDICAMENTOS ================= */

function renderMeds() {
  const cont = $('#lista-meds');
  if (meds.length === 0) {
    cont.innerHTML = `<div class="vacio-lista">Todavía no agregaste ningún medicamento.</div>`;
    return;
  }
  cont.innerHTML = meds.map((med) => `
    <div class="item-med" data-id="${med.id}">
      <div class="nombre">${escapeHtml(med.nombre)}</div>
      <div class="dosis">${escapeHtml(med.dosis || 'Sin indicación adicional')} · mínimo ${med.intervaloHoras} h entre tomas</div>
      <div class="horarios">${(med.horarios || []).map((h) => `<span class="chip-horario">${h}</span>`).join('')}</div>
    </div>
  `).join('');
  $$('.item-med').forEach((el) => {
    el.addEventListener('click', () => abrirModalMed(el.dataset.id));
  });
}

let horarioEditandoId = null;

function abrirModalMed(medId) {
  horarioEditandoId = medId || null;
  const med = medId ? meds.find((m) => m.id === medId) : null;

  $('#modal-med-titulo').textContent = med ? 'Editar medicamento' : 'Nuevo medicamento';
  $('#input-nombre').value = med ? med.nombre : '';
  $('#input-dosis').value = med ? (med.dosis || '') : '';
  $('#input-intervalo').value = med ? med.intervaloHoras : 8;
  $('#lista-horarios').innerHTML = '';
  (med ? med.horarios : ['08:00']).forEach((h) => agregarFilaHorario(h));
  $('#btn-eliminar-med').classList.toggle('oculto', !med);
  $('#modal-med').classList.remove('oculto');
}

function agregarFilaHorario(valor) {
  const fila = document.createElement('div');
  fila.className = 'horario-item';
  fila.innerHTML = `<input type="time" value="${valor || '08:00'}"><button type="button" aria-label="Quitar horario">✕</button>`;
  fila.querySelector('button').addEventListener('click', () => fila.remove());
  $('#lista-horarios').appendChild(fila);
}

$('#btn-agregar-horario').addEventListener('click', () => agregarFilaHorario('12:00'));
$('#btn-nuevo-med').addEventListener('click', () => abrirModalMed(null));
$('#btn-cancelar-med').addEventListener('click', () => $('#modal-med').classList.add('oculto'));

$('#btn-guardar-med').addEventListener('click', () => {
  const nombre = $('#input-nombre').value.trim();
  if (!nombre) { alert('Escribí el nombre del medicamento.'); return; }
  const horarios = $$('#lista-horarios input[type="time"]').map((i) => i.value).filter(Boolean).sort();
  if (horarios.length === 0) { alert('Agregá al menos un horario.'); return; }
  const intervaloHoras = Number($('#input-intervalo').value) || 8;
  const dosis = $('#input-dosis').value.trim();

  if (horarioEditandoId) {
    const med = meds.find((m) => m.id === horarioEditandoId);
    Object.assign(med, { nombre, dosis, horarios, intervaloHoras });
  } else {
    meds.push({ id: uid(), nombre, dosis, horarios, intervaloHoras });
  }
  Store.saveMeds(meds);
  $('#modal-med').classList.add('oculto');
  renderMeds();
  renderHoy();
  programarRecordatorios();
});

$('#btn-eliminar-med').addEventListener('click', () => {
  if (!horarioEditandoId) return;
  if (!confirm('¿Eliminar este medicamento? El historial de tomas ya registradas se conserva.')) return;
  meds = meds.filter((m) => m.id !== horarioEditandoId);
  Store.saveMeds(meds);
  $('#modal-med').classList.add('oculto');
  renderMeds();
  renderHoy();
  programarRecordatorios();
});

/* ================= CHEQUEO DE TOMA (confirmación manual + control de superposición) ================= */

function abrirChequeo(contexto) {
  chequeoContexto = contexto || null; // { medId, horario } o null (ad-hoc)
  confirmacionPendiente = false;
  $('#input-chequeo').value = '';
  $('#chequeo-alerta').className = 'alerta oculto';
  $('#chequeo-alerta').textContent = '';
  $('#btn-confirmar-chequeo').textContent = 'Confirmar toma';

  if (contexto) {
    const med = meds.find((m) => m.id === contexto.medId);
    $('#chequeo-titulo').textContent = 'Es hora de tu remedio';
    $('#chequeo-esperado').textContent = `Correspondía: ${med.nombre} · ${contexto.horario}`;
  } else {
    $('#chequeo-titulo').textContent = 'Registrar una toma';
    $('#chequeo-esperado').textContent = 'Anotá qué medicamento tomaste ahora.';
  }
  $('#modal-chequeo').classList.remove('oculto');
  setTimeout(() => $('#input-chequeo').focus(), 50);
}

$('#btn-registrar-ahora').addEventListener('click', () => abrirChequeo(null));
$('#btn-cancelar-chequeo').addEventListener('click', () => $('#modal-chequeo').classList.add('oculto'));

$('#btn-confirmar-chequeo').addEventListener('click', () => {
  const escrito = $('#input-chequeo').value.trim();
  if (!escrito) { alert('Escribí el nombre del medicamento.'); return; }

  const problemas = evaluarChequeo(escrito, chequeoContexto);

  if (problemas.length && !confirmacionPendiente) {
    mostrarAlertaChequeo(problemas);
    confirmacionPendiente = true;
    $('#btn-confirmar-chequeo').textContent = 'Confirmar de todas formas';
    return;
  }

  guardarToma(escrito, chequeoContexto, problemas);
  $('#modal-chequeo').classList.add('oculto');
  renderHoy();
});

function evaluarChequeo(escrito, contexto) {
  const problemas = [];
  const escritoNorm = normalizar(escrito);

  // 1) ¿Coincide con lo esperado en este horario?
  if (contexto) {
    const med = meds.find((m) => m.id === contexto.medId);
    if (med && normalizar(med.nombre) !== escritoNorm) {
      problemas.push({
        tipo: 'no-coincide',
        texto: `Anotaste "${escrito}", pero a las ${contexto.horario} correspondía "${med.nombre}". Revisá que sea el medicamento correcto antes de confirmar.`
      });
    }
  }

  // 2) ¿Superposición? buscar la última toma registrada con el mismo nombre (o mismo medicamento) y comparar horas
  const medCoincidente = meds.find((m) => normalizar(m.nombre) === escritoNorm)
    || (contexto ? meds.find((m) => m.id === contexto.medId) : null);

  const ultimaToma = historial
    .filter((h) => normalizar(h.nombreEscrito) === escritoNorm || (medCoincidente && h.medId === medCoincidente.id))
    .sort((a, b) => new Date(b.horaTomada) - new Date(a.horaTomada))[0];

  if (ultimaToma) {
    const horasDesde = (Date.now() - new Date(ultimaToma.horaTomada)) / 3600000;
    const minimo = medCoincidente ? medCoincidente.intervaloHoras : 8;
    if (horasDesde < minimo) {
      const faltan = (minimo - horasDesde).toFixed(1);
      problemas.push({
        tipo: 'superposicion',
        texto: `Ya se registró "${ultimaToma.nombreEscrito}" hace ${horasDesde.toFixed(1)} h. El mínimo entre tomas es de ${minimo} h — todavía faltarían ${faltan} h. Verificá que no se esté por duplicar la dosis.`
      });
    }
  }

  return problemas;
}

function mostrarAlertaChequeo(problemas) {
  const div = $('#chequeo-alerta');
  const esSuperposicion = problemas.some((p) => p.tipo === 'superposicion');
  div.className = 'alerta' + (esSuperposicion ? '' : ' tipo-aviso');
  div.innerHTML = problemas.map((p) => `⚠ ${escapeHtml(p.texto)}`).join('<br><br>');
}

function guardarToma(escrito, contexto, problemas) {
  const med = contexto ? meds.find((m) => m.id === contexto.medId) : meds.find((m) => normalizar(m.nombre) === normalizar(escrito));
  historial.unshift({
    id: uid(),
    fecha: hoyISO(),
    medId: contexto ? contexto.medId : (med ? med.id : null),
    nombreEscrito: escrito,
    horaEsperada: contexto ? contexto.horario : null,
    horaTomada: new Date().toISOString(),
    coincideNombre: contexto ? normalizar(med.nombre) === normalizar(escrito) : true,
    alertaSuperposicion: problemas.some((p) => p.tipo === 'superposicion')
  });
  Store.saveHistorial(historial);
}

/* ================= PANTALLA HISTORIAL ================= */

function renderHistorial() {
  const cont = $('#lista-historial');
  if (historial.length === 0) {
    cont.innerHTML = `<div class="vacio-lista">Todavía no hay tomas registradas.</div>`;
    return;
  }
  cont.innerHTML = historial.slice(0, 100).map((h) => {
    const fecha = new Date(h.horaTomada);
    const fechaStr = fecha.toLocaleDateString('es-AR') + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const alerta = h.alertaSuperposicion || h.coincideNombre === false;
    let detalle = h.horaEsperada ? `Programado para las ${h.horaEsperada}` : 'Registro manual';
    if (h.coincideNombre === false) detalle += ' · no coincidía con lo esperado';
    if (h.alertaSuperposicion) detalle += ' · posible superposición';
    return `
      <div class="item-historial ${alerta ? 'alerta-item' : ''}">
        <div class="fila-1"><span>${escapeHtml(h.nombreEscrito)}</span><span>${fechaStr}</span></div>
        <div class="fila-2">${detalle}</div>
      </div>
    `;
  }).join('');
}

/* ================= RECORDATORIOS ================= */

let temporizadores = [];

function programarRecordatorios() {
  temporizadores.forEach((t) => clearTimeout(t));
  temporizadores = [];

  meds.forEach((med) => {
    (med.horarios || []).forEach((horario) => {
      const [h, m] = horario.split(':').map(Number);
      const objetivo = new Date();
      objetivo.setHours(h, m, 0, 0);
      let msFaltan = objetivo - Date.now();
      if (msFaltan < 0) return; // ya pasó hoy, no reprogramar (se ve como "atrasada" en pantalla)
      const t = setTimeout(() => dispararRecordatorio(med, horario), msFaltan);
      temporizadores.push(t);
    });
  });
}

function dispararRecordatorio(med, horario) {
  const yaTomado = historial.some((h) => h.fecha === hoyISO() && h.medId === med.id && h.horaEsperada === horario);
  if (yaTomado) return;

  mostrarBanner(`Es hora de tomar: ${med.nombre} (${horario})`, () => abrirChequeo({ medId: med.id, horario }));

  if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active && reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'Es hora de tu remedio',
        body: `${med.nombre} · ${horario}`,
        tag: med.id + '-' + horario
      });
    });
  }
  renderHoy();
}

function mostrarBanner(texto, onClick) {
  const banner = $('#banner-recordatorio');
  banner.innerHTML = `<span>${escapeHtml(texto)}</span><button>Marcar</button>`;
  banner.classList.remove('oculto');
  banner.querySelector('button').addEventListener('click', () => {
    banner.classList.add('oculto');
    onClick();
  });
  setTimeout(() => banner.classList.add('oculto'), 30000);
}

// Revisión periódica de respaldo (por si el temporizador se pierde al minimizar la app)
setInterval(() => {
  const ahora = horaActualStr();
  meds.forEach((med) => {
    (med.horarios || []).forEach((horario) => {
      if (horario !== ahora) return;
      const clave = hoyISO() + '-' + med.id + '-' + horario;
      if (Store.getNotificados().includes(clave)) return;
      Store.addNotificado(clave);
      dispararRecordatorio(med, horario);
    });
  });
  $('#reloj').textContent = ahora;
  renderHoy();
}, 20000);

/* ================= Notificaciones y Service Worker ================= */

function pedirPermisoNotificaciones() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
document.body.addEventListener('click', pedirPermisoNotificaciones, { once: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

/* ================= Inicio ================= */

$('#reloj').textContent = horaActualStr();
renderHoy();
programarRecordatorios();
