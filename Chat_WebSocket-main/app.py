# Línea encargada de: importar objetos principales de Flask (rutas, plantillas, sesiones, redirecciones, mensajes flash)
from flask import Flask, render_template, request, session, redirect, url_for, flash

# Línea encargada de: importar SocketIO y utilidades para emitir eventos y administrar salas
from flask_socketio import SocketIO, emit, join_room, leave_room

# Línea encargada de: importar threading para ejecutar tareas en hilos
import threading


# =========================================================
# BLOQUE: APP FLASK
# Encargado de: crear y configurar la aplicación web
# =========================================================

# Línea encargada de: crear la instancia principal de Flask
app = Flask(__name__)

# Línea encargada de: configurar la llave secreta para sesiones y cookies firmadas
app.config['SECRET_KEY'] = 'llave_secreta'

# Línea encargada de: crear la instancia SocketIO vinculada a Flask
# Nota: cors_allowed_origins="*" permite conexiones desde cualquier origen
socketio = SocketIO(app, cors_allowed_origins="*")


# =========================================================
# BLOQUE: DICCIONARIO GLOBAL DE USUARIOS CONECTADOS
# Encargado de: almacenar usuarios activos por SID de SocketIO
# =========================================================

# Comentario encargado de: describir la estructura del diccionario global
# Estructura:
# usuarios_conectados = {
#   sid_socket: {
#       "usuario": "Juan",
#       "sala": "General",
#       "peerId": "abc123"
#   }
# }

# Línea encargada de: inicializar el diccionario global vacío
usuarios_conectados = {}


# =========================================================
# BLOQUE: FUNCIONES DE HILOS (MENSAJES)
# Encargado de: emitir mensajes en background para no bloquear el servidor
# =========================================================

# Función encargada de: procesar mensajes normales de texto en un hilo
def tarea_procesar_texto(data):
    """Procesa mensajes normales de texto en hilo"""

    # Línea encargada de: emitir el evento chat_message a todos los usuarios de la sala
    socketio.emit('chat_message', {
        'usuario': data['usuario'],   # Línea encargada de: incluir nombre de usuario
        'mensaje': data['mensaje'],   # Línea encargada de: incluir contenido del mensaje
        'tiempo': data['tiempo'],     # Línea encargada de: incluir timestamp formateado
        'tipo': 'texto'               # Línea encargada de: marcar tipo de mensaje como texto
    }, to=data['sala'])              # Línea encargada de: enviar SOLO a la sala


# Función encargada de: procesar emojis (tratados como texto) en un hilo
def tarea_procesar_emoji(data):
    """Procesa emojis (en el cliente siguen siendo texto)"""

    # Línea encargada de: emitir el mensaje igual que texto
    socketio.emit('chat_message', {
        'usuario': data['usuario'],   # Línea encargada de: incluir usuario
        'mensaje': data['mensaje'],   # Línea encargada de: incluir emoji
        'tiempo': data['tiempo'],     # Línea encargada de: incluir hora
        'tipo': 'texto'               # Línea encargada de: marcar tipo texto
    }, to=data['sala'])              # Línea encargada de: emitir solo en sala


# Función encargada de: procesar imágenes (Base64) en un hilo
def tarea_procesar_imagen(data):
    """Procesa imágenes en hilo (puede ser pesado)"""

    # Línea encargada de: emitir evento chat_message con tipo imagen
    socketio.emit('chat_message', {
        'usuario': data['usuario'],   # Línea encargada de: incluir usuario
        'mensaje': data['mensaje'],   # Línea encargada de: incluir DataURL/Base64
        'tiempo': data['tiempo'],     # Línea encargada de: incluir hora
        'tipo': 'imagen'              # Línea encargada de: marcar tipo como imagen
    }, to=data['sala'])              # Línea encargada de: emitir solo en sala


# =========================================================
# BLOQUE: RUTAS
# Encargado de: manejar navegación HTML (index y chat)
# =========================================================

# Decorador encargado de: registrar ruta raíz / con métodos GET y POST
@app.route('/', methods=['GET', 'POST'])
def index():
    """Pantalla inicial: usuario + sala"""

    # Condición encargada de: procesar envío de formulario
    if request.method == 'POST':

        # Línea encargada de: obtener usuario desde el formulario
        usuario = request.form.get('usuario')

        # Línea encargada de: obtener sala desde el formulario
        sala = request.form.get('sala')

        # Condición encargada de: validar que el usuario no esté vacío
        if not usuario:
            # Línea encargada de: mostrar mensaje flash al usuario
            flash('El nombre de usuario es requerido')

            # Línea encargada de: volver a renderizar index.html
            return render_template('index.html')

        # Línea encargada de: guardar usuario en sesión
        session['usuario'] = usuario

        # Línea encargada de: guardar sala en sesión
        session['sala'] = sala

        # Línea encargada de: redireccionar a la ruta /chat
        return redirect(url_for('chat'))

    # Línea encargada de: renderizar index.html en GET
    return render_template('index.html')


# Decorador encargado de: registrar ruta /chat
@app.route('/chat')
def chat():
    """Página del chat"""

    # Condición encargada de: validar que sesión tenga usuario y sala
    if 'usuario' not in session or 'sala' not in session:

        # Línea encargada de: mostrar mensaje flash
        flash('Por favor, ingresa un nombre de usuario y una sala')

        # Línea encargada de: regresar a index
        return redirect(url_for('index'))

    # Línea encargada de: renderizar chat.html pasando usuario y sala
    return render_template(
        'chat.html',
        usuario=session['usuario'],
        sala=session['sala']
    )


# =========================================================
# BLOQUE: SOCKET.IO EVENTS
# Encargado de: manejar eventos en tiempo real
# =========================================================

# Decorador encargado de: registrar evento 'join' de SocketIO
@socketio.on('join')
def unirse(data):
    """
    Se ejecuta cuando un usuario entra a una sala.
    Guardamos su info con request.sid.
    """

    # Línea encargada de: obtener usuario desde el payload
    usuario = data.get('usuario')

    # Línea encargada de: obtener sala desde el payload
    sala = data.get('sala')

    # Línea encargada de: obtener peerId desde el payload (puede ser None)
    peer_id = data.get('peerId')

    # Condición encargada de: validar que existan usuario y sala
    if not usuario or not sala:
        return

    # Línea encargada de: guardar al usuario en el diccionario global usando request.sid como llave
    usuarios_conectados[request.sid] = {
        'usuario': usuario,   # Línea encargada de: guardar nombre
        'sala': sala,         # Línea encargada de: guardar sala
        'peerId': peer_id     # Línea encargada de: guardar PeerID para videollamada
    }

    # Línea encargada de: unir el socket a la sala de SocketIO
    join_room(sala)

    # Línea encargada de: emitir mensaje de estado a la sala (entró)
    emit('status', {
        'msg': f'{usuario} se ha unido a la sala',
        'type': 'info'
    }, to=sala)

    # Línea encargada de: construir lista de usuarios SOLO de esa sala
    lista_usuarios = [
        u for u in usuarios_conectados.values()
        if u['sala'] == sala
    ]

    # Línea encargada de: emitir la lista actualizada de usuarios para refrescar grid de videos
    emit('update_users', lista_usuarios, to=sala)

    # Línea encargada de: imprimir log de debug en consola
    print(f"[JOIN] {usuario} | sala={sala} | sid={request.sid} | peer={peer_id}")


# Decorador encargado de: registrar evento leave (salida manual)
@socketio.on('leave')
def salir(data):
    """
    Se ejecuta si el cliente emite manualmente 'leave'.
    (Aunque en JS ya no se emite, es BUENO tenerlo correcto)
    """

    # Línea encargada de: obtener info del usuario desde el diccionario global usando request.sid
    info = usuarios_conectados.get(request.sid)

    # Condición encargada de: salir si no existe info
    if not info:
        return

    # Línea encargada de: extraer usuario
    usuario = info['usuario']

    # Línea encargada de: extraer sala
    sala = info['sala']

    # Línea encargada de: sacar socket de la sala
    leave_room(sala)

    # Línea encargada de: borrar al usuario del diccionario global
    del usuarios_conectados[request.sid]

    # Línea encargada de: emitir status a la sala indicando salida
    emit('status', {
        'msg': f'{usuario} ha salido de la sala',
        'type': 'warning'
    }, to=sala)

    # Línea encargada de: recalcular lista de usuarios de esa sala
    lista_usuarios = [
        u for u in usuarios_conectados.values()
        if u['sala'] == sala
    ]

    # Línea encargada de: emitir lista de usuarios actualizada
    emit('update_users', lista_usuarios, to=sala)

    # Línea encargada de: imprimir log de salida
    print(f"[LEAVE] {usuario} salió | sala={sala} | sid={request.sid}")


# Decorador encargado de: registrar evento message (texto/imagen)
@socketio.on('message')
def manejar_mensajes(data):
    """
    Recibe mensajes de texto, emoji o imagen.
    Delegamos el trabajo a hilos.
    """

    # Línea encargada de: obtener tipo (texto por defecto)
    tipo = data.get('tipo', 'texto')

    # Línea encargada de: obtener contenido del mensaje
    mensaje = data.get('mensaje', '')

    # Variable encargada de: marcar si se detecta emoji (detección simple)
    es_emoji = False

    # Condición encargada de: detectar emoji basado en longitud y que no sea alfanumérico
    if tipo == 'texto' and len(mensaje) < 10 and not mensaje.isalnum():
        es_emoji = True

    # Condición encargada de: enviar imágenes a su tarea en hilo
    if tipo == 'imagen':
        threading.Thread(target=tarea_procesar_imagen, args=(data,)).start()

    # Condición encargada de: enviar emojis a su tarea en hilo
    elif es_emoji:
        threading.Thread(target=tarea_procesar_emoji, args=(data,)).start()

    # Condición encargada de: enviar texto normal a su tarea en hilo
    else:
        threading.Thread(target=tarea_procesar_texto, args=(data,)).start()


# Decorador encargado de: registrar evento disconnect
@socketio.on('disconnect')
def desconectar():
    """
    Se ejecuta cuando el usuario:
    - cierra pestaña
    - refresca
    - pierde conexión
    - se cambia de página
    """

    # Línea encargada de: obtener info real desde el diccionario global por request.sid
    info = usuarios_conectados.get(request.sid)

    # Condición encargada de: salir si no existe info
    if not info:
        return

    # Línea encargada de: extraer usuario
    usuario = info['usuario']

    # Línea encargada de: extraer sala
    sala = info['sala']

    # Línea encargada de: borrar usuario del diccionario global
    del usuarios_conectados[request.sid]

    # Línea encargada de: sacar el socket de la sala
    leave_room(sala)

    # Línea encargada de: emitir status indicando desconexión
    emit('status', {
        'msg': f'{usuario} se desconectó',
        'type': 'warning'
    }, to=sala)

    # Línea encargada de: recalcular lista de usuarios de esa sala
    lista_usuarios = [
        u for u in usuarios_conectados.values()
        if u['sala'] == sala
    ]

    # Línea encargada de: emitir lista de usuarios actualizada
    emit('update_users', lista_usuarios, to=sala)

    # Línea encargada de: imprimir log de desconexión
    print(f"[DISCONNECT] {usuario} | sala={sala} | sid={request.sid}")


# =========================================================
# BLOQUE: ERROR 404
# Encargado de: redireccionar cuando una ruta no existe
# =========================================================

# Decorador encargado de: manejar error HTTP 404
@app.errorhandler(404)
def page_not_found(e):

    # Línea encargada de: mostrar mensaje flash
    flash('La página que buscas no existe', 'error')

    # Línea encargada de: redireccionar a index
    return redirect(url_for('index'))


# =========================================================
# BLOQUE: MAIN
# Encargado de: iniciar el servidor Flask + SocketIO
# =========================================================

# Condición encargada de: ejecutar solo si el archivo se corre directamente
if __name__ == '__main__':

    # Línea encargada de: iniciar servidor con debug y host accesible en red local
    socketio.run(app, debug=True, host='0.0.0.0')
