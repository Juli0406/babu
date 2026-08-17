# Mis Remedios — App instalable de recordatorios de medicación

Es una **PWA** (app web instalable): no requiere tienda de aplicaciones, se instala
directamente desde el navegador y queda como un ícono más en el celular, funcionando
sin conexión a internet una vez instalada.

## Qué hace

- **Cargar medicamentos**: nombre, indicación de dosis, uno o varios horarios por día,
  y las horas mínimas que deben pasar entre dos tomas del mismo remedio.
- **Recordatorio**: a la hora programada avisa (notificación + aviso en pantalla).
- **Chequeo manual**: la persona escribe a mano el nombre del medicamento que tomó.
  - Si lo que escribió **no coincide** con lo que correspondía a esa hora, la app lo
    avisa antes de guardar la toma.
  - Si esa misma medicación **ya fue tomada hace menos horas que el mínimo indicado**,
    la app muestra una alerta de posible **superposición/duplicación de dosis** antes
    de dejar confirmar.
- **Historial**: queda guardado cada registro (coincidió o no, si hubo alerta de
  superposición), para poder revisarlo después.

Toda la información se guarda **en el propio celular** (no se envía a ningún servidor).

## Cómo instalarla en un celular

Como es una app web, primero hay que "publicarla" en algún lugar accesible por
HTTPS (el "Agregar a pantalla de inicio" no funciona abriendo el archivo directo
desde el celular). La forma más simple y gratuita:

### Opción recomendada: GitHub Pages (gratis, 5 minutos)

1. Crear una cuenta gratuita en https://github.com si no tenés una.
2. Crear un repositorio nuevo (puede llamarse `mis-remedios`).
3. Subir todos los archivos de esta carpeta (`index.html`, `styles.css`, `app.js`,
   `manifest.json`, `service-worker.js` y la carpeta `icons`) usando el botón
   "Add file → Upload files" en la web de GitHub.
4. Ir a **Settings → Pages**, y en "Branch" elegir `main` y guardar.
5. GitHub va a dar una dirección tipo `https://tu-usuario.github.io/mis-remedios/`.
6. Abrir esa dirección desde el **navegador del celular** (Chrome en Android,
   Safari en iPhone).
7. En Android (Chrome): tocar el menú (⋮) → **"Instalar app"** o **"Agregar a
   pantalla de inicio"**.
   En iPhone (Safari): tocar el botón compartir (□↑) → **"Agregar a pantalla
   de inicio"**.
8. Queda un ícono en el celular que abre la app como si fuera nativa.

### Alternativa rápida sin subir a internet (para probarla en casa)

Si el celular y la computadora están en la misma red Wi-Fi, se puede levantar
un servidor local:

```
cd mis-remedios
python3 -m http.server 8080
```

y en el celular abrir `http://IP-DE-LA-COMPUTADORA:8080` (por ejemplo
`http://192.168.0.15:8080`). Esto sirve para probarla, pero al apagar la
computadora deja de funcionar — para uso diario conviene la Opción 1.

## Importante sobre los recordatorios

Los navegadores no permiten que una web despierte sola al celular en segundo
plano de forma perfecta (eso solo lo logran apps nativas con notificaciones
push desde un servidor). Esta app hace lo mejor posible con las herramientas
disponibles:

- Si la app está abierta o en segundo plano reciente, el aviso va a sonar/vibrar
  puntualmente.
- Conviene **dejar la app abierta o recientemente usada** en el celular del
  adulto mayor, y no forzar su cierre desde el administrador de aplicaciones.
- Como respaldo, es buena idea combinarla con una alarma del propio celular
  (Reloj/Despertador) a la misma hora, hasta tanto se pueda sumar un sistema
  de notificaciones push con servidor propio si en el futuro se quiere una
  garantía total de aviso aunque el teléfono esté apagado o sin la app abierta
  hace mucho tiempo.

## Próximos pasos posibles (si querés que los sume)

- Un modo "familiar/cuidador" que reciba una alerta en su propio celular
  cuando falte una toma.
- Notificaciones push reales con un pequeño servidor (para que avisen incluso
  con la app cerrada hace tiempo).
- Lista de interacciones/combinaciones a evitar entre dos medicamentos
  distintos (no solo repetición del mismo remedio).
