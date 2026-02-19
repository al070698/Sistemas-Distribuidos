// ======================================================
// BLOQUE: Título general del archivo
// Encargado de: describir la funcionalidad principal del script
// ======================================================


// BLOQUE: Validación inicial de existencia de la vista de chat
// Encargado de: evitar que el script se ejecute en páginas donde no existe el chat
if (document.getElementById("chatDeMensajes")) {

    // ------------------------------------------------------
    // BLOQUE 1) CONEXIONES PRINCIPALES
    // Encargado de: crear conexiones Socket.IO y PeerJS
    // ------------------------------------------------------

    // Línea encargada de: conectar el cliente al servidor Socket.IO usando configuración por defecto
    const socket = io();

    // Línea encargada de: crear una instancia PeerJS para manejar WebRTC P2P
    // Nota: usa el servidor público de PeerJS por defecto
    const peer = new Peer();


    // ------------------------------------------------------
    // BLOQUE 2) ELEMENTOS DEL DOM
    // Encargado de: capturar referencias HTML necesarias para chat y videollamada
    // ------------------------------------------------------

    // Línea encargada de: capturar el formulario de envío de mensajes
    const mensajeForm = document.getElementById("mensajesForm");

    // Línea encargada de: capturar el input donde se escribe el mensaje
    const mensajeInput = document.getElementById("mensajeInput");

    // Línea encargada de: capturar el contenedor principal del chat
    const chatDeMensajes = document.getElementById("chatDeMensajes");

    // Línea encargada de: capturar el elemento que contiene el nombre del usuario (texto oculto o visible)
    const usuarioPantalla = document.getElementById("usuarioPantalla");

    // Línea encargada de: capturar el elemento que contiene el nombre de la sala (texto oculto o visible)
    const salaPantalla = document.getElementById("salaPantalla");

    // Línea encargada de: capturar el botón/enlace de salir
    const btnSalir = document.querySelector(".salir");

    // Línea encargada de: capturar el botón de menú extra (+)
    const btnMas = document.getElementById("btnMas");

    // Línea encargada de: capturar el menú desplegable de adjuntos
    const menuAdjunto = document.getElementById("menuAdjunto");

    // Línea encargada de: capturar la vista principal del menú (opciones)
    const vistaOpciones = document.getElementById("vistaOpciones");

    // Línea encargada de: capturar la vista de emojis
    const vistaEmojis = document.getElementById("vistaEmojis");

    // Línea encargada de: capturar el botón para mostrar emojis
    const btnEmojis = document.getElementById("btnEmojis");

    // Línea encargada de: capturar el botón para subir foto
    const btnFoto = document.getElementById("btnFoto");

    // Línea encargada de: capturar el input file para subir imágenes
    const inputArchivo = document.getElementById("inputArchivo");

    // Línea encargada de: capturar el contenedor grid donde se renderizan usuarios/video
    const gridUsuarios = document.getElementById("gridUsuarios");

    // Línea encargada de: capturar el botón de micrófono
    const btnMic = document.getElementById("btnMic");

    // Línea encargada de: capturar el botón de cámara
    const btnCam = document.getElementById("btnCam");


    // ------------------------------------------------------
    // BLOQUE 3) VARIABLES DE USUARIO
    // Encargado de: obtener usuario y sala desde el DOM
    // ------------------------------------------------------

    // Línea encargada de: obtener el nombre del usuario desde el DOM, o asignar fallback
    const usuario = usuarioPantalla ? usuarioPantalla.textContent.trim() : "Usuario Desconocido";

    // Línea encargada de: obtener el nombre de la sala desde el DOM, o asignar fallback
    const sala = salaPantalla ? salaPantalla.textContent.trim() : "Sala Desconocida";


    // ------------------------------------------------------
    // BLOQUE 4) VARIABLES DE MEDIA / VIDEOLLAMADA
    // Encargado de: definir estado de streams, peerId y banderas mic/cam
    // ------------------------------------------------------

    // Variable encargada de: almacenar el stream local (cámara + micrófono)
    let localStream = null;

    // Variable encargada de: almacenar el ID PeerJS asignado al usuario
    let myPeerId = null;

    // Variable encargada de: representar el estado de cámara (encendida/apagada)
    let camaraEncendida = true;

    // Variable encargada de: representar el estado de micrófono (encendido/apagado)
    let microfonoEncendido = true;

    // Objeto encargado de: guardar streams remotos indexados por peerId
    const streamsRemotos = {};

    // Variable encargada de: almacenar lista global de usuarios recibida del servidor
    let listaUsuariosGlobal = [];


    // ------------------------------------------------------
    // BLOQUE 5) FUNCIONES AUXILIARES (BOTONES MIC/CAM)
    // Encargado de: cambiar estilos visuales según estado
    // ------------------------------------------------------

    // Función encargada de: actualizar estilos CSS del botón según esté activo o bloqueado
    function actualizarEstiloBoton(btn, activo) {

        // Línea encargada de: salir si el botón no existe
        if (!btn) return;

        // Condición encargada de: aplicar estilos cuando el botón está activo
        if (activo) {
            // Línea encargada de: quitar clase de bloqueo
            btn.classList.remove("bloqueo");

            // Línea encargada de: pintar fondo blanco
            btn.style.backgroundColor = "white";

            // Línea encargada de: pintar texto oscuro
            btn.style.color = "#333";
        } else {
            // Línea encargada de: agregar clase de bloqueo
            btn.classList.add("bloqueo");

            // Línea encargada de: limpiar fondo (volver al CSS original)
            btn.style.backgroundColor = "";

            // Línea encargada de: limpiar color (volver al CSS original)
            btn.style.color = "";
        }
    }


    // ------------------------------------------------------
    // BLOQUE 6) PEERJS - EVENTOS PRINCIPALES
    // Encargado de: manejar asignación de ID y recepción de llamadas
    // ------------------------------------------------------

    // Función encargada de: ejecutarse cuando PeerJS asigna un ID
    function alAbrirPeer(id) {

        // Línea encargada de: guardar el PeerID asignado
        myPeerId = id;

        // Línea encargada de: imprimir el PeerID en consola
        console.log("✅ Mi PeerID:", myPeerId);

        // Línea encargada de: iniciar permisos de cámara/mic y luego unirse al socket
        iniciarMedia();
    }

    // Función encargada de: ejecutarse cuando otro peer inicia una llamada hacia este cliente
    function alRecibirLlamada(call) {

        // Línea encargada de: mostrar en consola quién llama
        console.log("📥 Llamada entrante de:", call.peer);

        // Condición encargada de: ignorar la llamada si aún no existe stream local
        if (!localStream) {
            console.warn("⚠️ Me llamaron pero aún no tengo localStream. Ignorando llamada.");
            return;
        }

        // Línea encargada de: responder la llamada enviando el stream local
        call.answer(localStream);

        // Listener encargado de: capturar el stream remoto entrante
        call.on("stream", function(remoteStream) {

            // Línea encargada de: mostrar que se recibió el stream remoto
            console.log("🎥 Stream remoto recibido de:", call.peer);

            // Línea encargada de: guardar el stream remoto por peerId
            streamsRemotos[call.peer] = remoteStream;

            // Línea encargada de: redibujar el grid de videos
            actualizarGridVideos();
        });

        // Listener encargado de: detectar cierre de llamada
        call.on("close", function() {

            // Línea encargada de: mostrar cierre en consola
            console.log("❌ Llamada cerrada con:", call.peer);

            // Línea encargada de: eliminar el stream remoto de la memoria
            delete streamsRemotos[call.peer];

            // Línea encargada de: redibujar el grid
            actualizarGridVideos();
        });

        // Listener encargado de: capturar errores WebRTC/PeerJS en llamada entrante
        call.on("error", function(err) {
            console.error("🚨 Error en llamada entrante:", err);
        });
    }

    // Listener encargado de: ejecutar función al obtener PeerID
    peer.on("open", alAbrirPeer);

    // Listener encargado de: ejecutar función al recibir llamada
    peer.on("call", alRecibirLlamada);


    // ------------------------------------------------------
    // BLOQUE 7) MEDIA - PEDIR CÁMARA Y UNIRSE AL CHAT
    // Encargado de: obtener permisos y entrar al socket solo si hay PeerID
    // ------------------------------------------------------

    // Función asíncrona encargada de: solicitar cámara/mic y luego hacer join en Socket.IO
    async function iniciarMedia() {
        try {
            // Línea encargada de: pedir stream de video + audio al navegador
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Línea encargada de: encender track de video
            localStream.getVideoTracks()[0].enabled = true;

            // Línea encargada de: encender track de audio
            localStream.getAudioTracks()[0].enabled = true;

            // Línea encargada de: actualizar estilo de botón cámara a activo
            actualizarEstiloBoton(btnCam, true);

            // Línea encargada de: actualizar estilo de botón mic a activo
            actualizarEstiloBoton(btnMic, true);

            // Línea encargada de: enviar evento join al servidor Socket.IO con usuario/sala/peerId
            socket.emit("join", {
                usuario: usuario,
                sala: sala,
                peerId: myPeerId
            });

            // Línea encargada de: imprimir confirmación de unión al socket
            console.log("✅ Unido al socket con video:", usuario, sala);

        } catch (error) {

            // Línea encargada de: mostrar error de permisos o hardware
            console.error("🚨 Error accediendo a cámara/mic:", error);

            // Línea encargada de: mostrar alerta al usuario
            alert("No se pudo acceder a la cámara/micrófono. Revisa permisos.");

            // Línea encargada de: unirse al socket incluso sin video (peerId nulo)
            socket.emit("join", {
                usuario: usuario,
                sala: sala,
                peerId: null
            });

            // Línea encargada de: imprimir unión sin video
            console.log("⚠️ Unido al socket SIN video:", usuario, sala);
        }
    }


    // ------------------------------------------------------
    // BLOQUE 8) GRID DE VIDEOS (DIBUJAR TARJETAS)
    // Encargado de: renderizar tarjetas de usuarios y video local/remoto
    // ------------------------------------------------------

    // Función encargada de: dibujar el grid completo basado en listaUsuariosGlobal
    function actualizarGridVideos() {

        // Línea encargada de: salir si no existe el contenedor grid
        if (!gridUsuarios) return;

        // Línea encargada de: limpiar el contenido actual del grid
        gridUsuarios.innerHTML = "";

        // Bucle encargado de: recorrer usuarios recibidos desde el servidor
        listaUsuariosGlobal.forEach((u, index) => {

            // Línea encargada de: crear contenedor tarjeta para usuario
            const tarjeta = document.createElement("div");

            // Línea encargada de: definir índice de color cíclico
            const colorIndex = index % 4;

            // Línea encargada de: agregar clases CSS a la tarjeta
            tarjeta.classList.add("tarjeta-usuario", `color-${colorIndex}`);

            // Línea encargada de: insertar HTML base con iconos, avatar y nombre
            tarjeta.innerHTML = `
                <div class="iconos-estado"><span>📷</span> <span>🎤</span></div>
                <div class="avatar-grande">👤</div>
                <div class="nombre-usuario">${u.usuario}</div>
            `;

            // Variable encargada de: definir qué stream se usará en esta tarjeta
            let streamAUsar = null;

            // Variable encargada de: indicar si la tarjeta corresponde al usuario actual
            let esMiVideo = false;

            // Condición encargada de: detectar si el usuario iterado es el mismo cliente actual
            if (u.peerId && u.peerId === myPeerId) {
                // Línea encargada de: asignar stream local
                streamAUsar = localStream;

                // Línea encargada de: marcar como video propio
                esMiVideo = true;
            }
            // Condición encargada de: asignar stream remoto si existe para ese peerId
            else if (u.peerId && streamsRemotos[u.peerId]) {
                // Línea encargada de: asignar stream remoto
                streamAUsar = streamsRemotos[u.peerId];
            }

            // Condición encargada de: crear etiqueta video si hay stream disponible
            if (streamAUsar) {

                // Línea encargada de: crear elemento <video>
                const videoTag = document.createElement("video");

                // Línea encargada de: asignar stream al video
                videoTag.srcObject = streamAUsar;

                // Línea encargada de: activar autoplay
                videoTag.autoplay = true;

                // Línea encargada de: permitir reproducción inline en móviles
                videoTag.playsInline = true;

                // Línea encargada de: aplicar clase CSS al video
                videoTag.classList.add("video-usuario");

                // Condición encargada de: aplicar mute y espejo al video propio
                if (esMiVideo) {
                    // Línea encargada de: mutear audio del video propio para evitar eco
                    videoTag.muted = true;

                    // Línea encargada de: espejar la cámara para vista tipo espejo
                    videoTag.style.transform = "scaleX(-1)";
                } else {
                    // Línea encargada de: asegurar audio activo para streams remotos
                    videoTag.muted = false;
                }

                // Línea encargada de: marcar la tarjeta como con-video
                tarjeta.classList.add("con-video");

                // Línea encargada de: insertar el video al inicio de la tarjeta
                tarjeta.prepend(videoTag);
            }

            // Línea encargada de: insertar tarjeta al grid
            gridUsuarios.appendChild(tarjeta);
        });
    }


    // ------------------------------------------------------
    // BLOQUE 9) BOTONES MIC / CAM
    // Encargado de: activar o desactivar tracks del stream local
    // ------------------------------------------------------

    // Condición encargada de: registrar listener si existe el botón cámara
    if (btnCam) {
        btnCam.addEventListener("click", function() {

            // Línea encargada de: salir si no existe localStream
            if (!localStream) return;

            // Línea encargada de: alternar estado booleano de cámara
            camaraEncendida = !camaraEncendida;

            // Línea encargada de: habilitar/deshabilitar el track de video
            localStream.getVideoTracks()[0].enabled = camaraEncendida;

            // Línea encargada de: actualizar estilos del botón
            actualizarEstiloBoton(btnCam, camaraEncendida);
        });
    }

    // Condición encargada de: registrar listener si existe el botón micrófono
    if (btnMic) {
        btnMic.addEventListener("click", function() {

            // Línea encargada de: salir si no existe localStream
            if (!localStream) return;

            // Línea encargada de: alternar estado booleano de micrófono
            microfonoEncendido = !microfonoEncendido;

            // Línea encargada de: habilitar/deshabilitar el track de audio
            localStream.getAudioTracks()[0].enabled = microfonoEncendido;

            // Línea encargada de: actualizar estilos del botón
            actualizarEstiloBoton(btnMic, microfonoEncendido);
        });
    }


    // ------------------------------------------------------
    // BLOQUE 10) SOCKET.IO - LISTA DE USUARIOS (LA CLAVE)
    // Encargado de: renderizar usuarios y crear llamadas sin duplicados
    // ------------------------------------------------------

    // Listener encargado de: recibir lista completa de usuarios conectados desde el servidor
    socket.on("update_users", function(listaUsuarios) {

        // Línea encargada de: guardar la lista en variable global
        listaUsuariosGlobal = listaUsuarios;

        // ---------------------------
        // SUB-BLOQUE: Limpieza de streams remotos
        // Encargado de: eliminar streams de usuarios desconectados
        // ---------------------------

        // Línea encargada de: construir un Set con peerIds actuales (sin incluir el propio)
        const peerIdsActuales = new Set(
            listaUsuarios
                .map(u => u.peerId)                 // Línea encargada de: extraer peerId
                .filter(pid => pid && pid !== myPeerId) // Línea encargada de: filtrar null y propio
        );

        // Línea encargada de: recorrer streams remotos existentes
        Object.keys(streamsRemotos).forEach(pid => {

            // Condición encargada de: borrar stream remoto si ya no está en la lista
            if (!peerIdsActuales.has(pid)) {
                delete streamsRemotos[pid];
            }
        });

        // Línea encargada de: redibujar el grid con la lista nueva
        actualizarGridVideos();

        // Línea encargada de: detener lógica de llamadas si no hay stream local o peerId
        if (!localStream || !myPeerId) return;

        // ---------------------------
        // SUB-BLOQUE: Llamadas sin duplicado
        // Encargado de: evitar que dos usuarios se llamen al mismo tiempo
        // ---------------------------

        // Bucle encargado de: recorrer usuarios y llamar a quien corresponda
        listaUsuarios.forEach(u => {

            // Condición encargada de: ignorar usuarios sin peerId
            if (!u.peerId) return;

            // Condición encargada de: evitar llamarse a sí mismo
            if (u.peerId === myPeerId) return;

            // Condición encargada de: evitar volver a llamar si ya existe stream remoto
            if (streamsRemotos[u.peerId]) return;

            // Condición encargada de: regla anti duplicado usando comparación de peerId
            if (myPeerId > u.peerId) {

                // Línea encargada de: mostrar en consola a quién se llama
                console.log("📞 Llamando a:", u.usuario, u.peerId);

                // Línea encargada de: iniciar llamada PeerJS enviando stream local
                const call = peer.call(u.peerId, localStream);

                // Listener encargado de: capturar stream remoto cuando se conecte
                call.on("stream", function(remoteStream) {
                    streamsRemotos[u.peerId] = remoteStream;
                    actualizarGridVideos();
                });

                // Listener encargado de: detectar cierre de llamada y limpiar stream
                call.on("close", function() {
                    delete streamsRemotos[u.peerId];
                    actualizarGridVideos();
                });

                // Listener encargado de: capturar errores de llamada saliente
                call.on("error", function(err) {
                    console.error("🚨 Error llamando a", u.peerId, err);
                });
            }
        });
    });


    // ------------------------------------------------------
    // BLOQUE 11) CHAT - EMOJIS + MENÚ + FOTO
    // Encargado de: renderizar emojis y manejar menú adjuntos
    // ------------------------------------------------------

    // Arreglo encargado de: contener emojis disponibles en el selector
    const listaEmojis = [
        "\u{1F600}", "\u{1F601}", "\u{1F602}", "\u{1F923}", "\u{1F603}",
        "\u{1F604}", "\u{1F605}", "\u{1F606}", "\u{1F609}", "\u{1F60A}",
        "\u{1F60B}", "\u{1F60E}", "\u{1F60D}", "\u{1F618}", "\u{1F970}",
        "\u{1F610}", "\u{1F611}", "\u{1F636}", "\u{1F644}", "\u{1F60F}",
        "\u{1F623}", "\u{1F625}", "\u{1F62E}", "\u{1F62F}", "\u{1F62A}",
        "\u{1F62B}", "\u{1F634}", "\u{1F60C}", "\u{1F61B}", "\u{1F61C}",
        "\u{1F61D}", "\u{1F924}", "\u{1F612}", "\u{1F613}", "\u{1F614}",
        "\u{1F615}", "\u{1F643}", "\u{1F911}", "\u{1F632}"
    ];

    // Función encargada de: insertar el emoji seleccionado en el input de mensaje
    function alHacerClicEnEmoji(evento) {
        mensajeInput.value += evento.target.textContent;
        mensajeInput.focus();
    }

    // Condición encargada de: generar la lista de emojis si existe la vista
    if (vistaEmojis) {

        // Línea encargada de: limpiar vista de emojis
        vistaEmojis.innerHTML = "";

        // Bucle encargado de: crear un span por cada emoji
        listaEmojis.forEach(emoji => {

            // Línea encargada de: crear elemento span
            const span = document.createElement("span");

            // Línea encargada de: asignar emoji como texto
            span.textContent = emoji;

            // Línea encargada de: aplicar clase CSS
            span.classList.add("emoji-item");

            // Línea encargada de: asignar evento click al emoji
            span.addEventListener("click", alHacerClicEnEmoji);

            // Línea encargada de: insertar emoji en la vista
            vistaEmojis.appendChild(span);
        });
    }

    // Condición encargada de: registrar evento click para abrir menú adjuntos
    if (btnMas) {
        btnMas.addEventListener("click", function() {

            // Línea encargada de: alternar visibilidad del menú adjunto
            menuAdjunto.classList.toggle("oculto");

            // Línea encargada de: mostrar vista de opciones
            vistaOpciones.classList.remove("oculto");

            // Línea encargada de: ocultar vista de emojis
            vistaEmojis.classList.add("oculto");
        });
    }

    // Condición encargada de: registrar evento para abrir panel de emojis
    if (btnEmojis) {
        btnEmojis.addEventListener("click", function() {

            // Línea encargada de: ocultar opciones
            vistaOpciones.classList.add("oculto");

            // Línea encargada de: mostrar emojis
            vistaEmojis.classList.remove("oculto");
        });
    }

    // Condición encargada de: registrar evento para abrir selector de foto
    if (btnFoto) {
        btnFoto.addEventListener("click", function() {

            // Línea encargada de: simular click al input file
            inputArchivo.click();

            // Línea encargada de: ocultar menú adjunto
            menuAdjunto.classList.add("oculto");
        });
    }

    // Listener global encargado de: cerrar menú adjunto si se hace click fuera
    document.addEventListener("click", function(e) {

        // Condición encargada de: detectar click fuera del botón y fuera del menú
        if (btnMas && menuAdjunto && !btnMas.contains(e.target) && !menuAdjunto.contains(e.target)) {
            menuAdjunto.classList.add("oculto");
        }
    });


    // ------------------------------------------------------
    // BLOQUE 12) ENVÍO DE FOTO
    // Encargado de: convertir imagen a Base64 y enviarla por socket
    // ------------------------------------------------------

    // Condición encargada de: registrar listener si existe input file
    if (inputArchivo) {
        inputArchivo.addEventListener("change", function(e) {

            // Línea encargada de: obtener el archivo seleccionado
            const archivo = e.target.files[0];

            // Línea encargada de: salir si no se seleccionó archivo
            if (!archivo) return;

            // Línea encargada de: crear FileReader para leer la imagen
            const reader = new FileReader();

            // Listener encargado de: ejecutar cuando la lectura termine
            reader.onload = function(eventoLectura) {

                // Línea encargada de: obtener hora actual
                const ahora = new Date();

                // Línea encargada de: formatear hora a HH:MM
                const tiempo = ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                // Línea encargada de: emitir mensaje al servidor con tipo imagen
                socket.emit("message", {
                    usuario: usuario,
                    sala: sala,
                    mensaje: eventoLectura.target.result,
                    tiempo: tiempo,
                    tipo: "imagen"
                });
            };

            // Línea encargada de: leer archivo como DataURL (Base64)
            reader.readAsDataURL(archivo);

            // Línea encargada de: resetear input para permitir subir la misma imagen dos veces
            e.target.value = "";
        });
    }


    // ------------------------------------------------------
    // BLOQUE 13) ENVÍO DE TEXTO
    // Encargado de: enviar mensaje normal por socket
    // ------------------------------------------------------

    // Condición encargada de: registrar listener si existe el formulario
    if (mensajeForm) {
        mensajeForm.addEventListener("submit", function(e) {

            // Línea encargada de: evitar recarga de página por submit
            e.preventDefault();

            // Línea encargada de: obtener texto del input y recortar espacios
            const mensaje = mensajeInput.value.trim();

            // Línea encargada de: salir si el mensaje está vacío
            if (!mensaje) return;

            // Línea encargada de: obtener fecha/hora actual
            const ahora = new Date();

            // Línea encargada de: formatear hora en HH:MM
            const tiempo = ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            // Línea encargada de: emitir mensaje al servidor con tipo texto
            socket.emit("message", {
                usuario: usuario,
                sala: sala,
                mensaje: mensaje,
                tiempo: tiempo,
                tipo: "texto"
            });

            // Línea encargada de: limpiar input
            mensajeInput.value = "";

            // Línea encargada de: devolver foco al input
            mensajeInput.focus();
        });
    }


    // ------------------------------------------------------
    // BLOQUE 14) RECEPCIÓN DE MENSAJES
    // Encargado de: renderizar mensajes de texto o imagen en el chat
    // ------------------------------------------------------

    // Listener encargado de: recibir mensajes del servidor
    socket.on("chat_message", function(data) {

        // Condición encargada de: corregir tipo si llega DataURL pero tipo incorrecto
        if (data.tipo !== "imagen" && typeof data.mensaje === "string" && data.mensaje.startsWith("data:image")) {
            data.tipo = "imagen";
        }

        // Línea encargada de: crear div contenedor del mensaje
        const mensajeElemento = document.createElement("div");

        // Línea encargada de: aplicar clase base
        mensajeElemento.classList.add("chat-message");

        // Condición encargada de: aplicar estilo según sea propio o ajeno
        if (data.usuario === usuario) {
            mensajeElemento.classList.add("my-message");
        } else {
            mensajeElemento.classList.add("other-message");
        }

        // Variable encargada de: almacenar el HTML final del contenido del mensaje
        let contenidoHTML = "";

        // Condición encargada de: renderizar imagen si el tipo es imagen
        if (data.tipo === "imagen") {
            contenidoHTML = `<img src="${data.mensaje}" class="imagen-chat">`;
        } else {
            // Línea encargada de: renderizar texto normal
            contenidoHTML = `<div class="mensajeTexto">${data.mensaje}</div>`;
        }

        // Línea encargada de: construir el HTML final del mensaje
        mensajeElemento.innerHTML = `
            <span class="message-nickname">${data.usuario}:</span>
            ${contenidoHTML}
            <span class="message-timestamp">${data.tiempo}</span>
        `;

        // Línea encargada de: insertar mensaje en el chat
        chatDeMensajes.appendChild(mensajeElemento);

        // Línea encargada de: bajar scroll automáticamente
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight;
    });


    // ------------------------------------------------------
    // BLOQUE 15) RECEPCIÓN DE ESTADOS (ENTRÓ / SALIÓ)
    // Encargado de: mostrar mensajes del sistema tipo "entró/salió"
    // ------------------------------------------------------

    // Listener encargado de: recibir mensajes de estado del servidor
    socket.on("status", function(data) {

        // Línea encargada de: crear div para el estado
        const statusElemento = document.createElement("div");

        // Línea encargada de: aplicar clases según tipo de estado
        statusElemento.classList.add("chat-message", data.type || "info");

        // Línea encargada de: insertar el texto del estado
        statusElemento.innerHTML = `<p><em>${data.msg}</em></p>`;

        // Línea encargada de: agregar el estado al chat
        chatDeMensajes.appendChild(statusElemento);

        // Línea encargada de: bajar scroll al final
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight;
    });


    // ------------------------------------------------------
    // BLOQUE 16) BOTÓN SALIR
    // Encargado de: salir de la sala cambiando de página sin emitir leave duplicado
    // ------------------------------------------------------

    // Condición encargada de: registrar listener si existe botón salir
    if (btnSalir) {
        btnSalir.addEventListener("click", function(e) {

            // Línea encargada de: evitar comportamiento por defecto inmediato
            e.preventDefault();

            // Línea encargada de: redireccionar a la URL del enlace
            // Nota: se evita emitir leave manual para no duplicar eventos
            window.location.href = this.href;
        });
    }
}
