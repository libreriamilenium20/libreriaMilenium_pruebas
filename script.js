// CONFIGURACIÓN FIREBASE REALTIME DATABASE
    const firebaseConfig = {
      apiKey: "AIzaSyDkxZO_rT-_3yy1JdekkQmiStQNkqzwGYI",
      authDomain: "libreria-milenium.firebaseapp.com",
      databaseURL: "https://libreria-milenium-default-rtdb.firebaseio.com",
      projectId: "libreria-milenium",
      storageBucket: "libreria-milenium.firebasestorage.app",
      messagingSenderId: "691981895582",
      appId: "1:691981895582:web:b3af21222d14f7e8af788f",
      measurementId: "G-0BW3PRC67M"
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const booksRef = db.ref('libros');
    const configRef = db.ref('configuracion_sitio');
    const commentsRef = db.ref('comentarios');

    // ESTADOS DE NAVEGACIÓN
    let librosGlobal = [];
    let comentariosGlobal = [];
    let configGlobal = {};
    let categoriaActiva = 'Todas';
    let filtroNovedadesActivo = false;
    let carruselPosicion = 0;
    let carruselInterval = null;

    document.addEventListener('DOMContentLoaded', () => {
      cargarFondoAnimado();
      escucharBaseDeDatos();
      escucharConfiguracion();
      escucharComentarios();
      iniciarCarruselAuto();
    });

    // 1. SINCRONIZACIÓN EN TIEMPO REAL
    function escucharBaseDeDatos() {
      booksRef.on('value', (snapshot) => {
        const data = snapshot.val();
        librosGlobal = [];
        if (data) {
          Object.keys(data).forEach(key => {
            librosGlobal.push({ id: key, ...data[key] });
          });
        }
        actualizarCategoriasDinamicas();
        renderizarCatalogo();
        renderizarCarrusel();
        actualizarEstadisticasAdmin();
        renderizarTablaAdmin();
      });
    }

    function escucharConfiguracion() {
      configRef.on('value', (snapshot) => {
        configGlobal = snapshot.val() || {};
        
        if (configGlobal.logoLeft) {
          document.getElementById('main-logo-left').src = configGlobal.logoLeft;
          document.getElementById('config-logo-left').value = configGlobal.logoLeft;
        }
        if (configGlobal.logoRight) {
          document.getElementById('main-logo-right').src = configGlobal.logoRight;
          document.getElementById('config-logo-right').value = configGlobal.logoRight;
        }

        if (configGlobal.colorPrimary) {
          document.documentElement.style.setProperty('--color-primario', configGlobal.colorPrimary);
          document.getElementById('config-color-primario').value = configGlobal.colorPrimary;
        }
        if (configGlobal.colorSecondary) {
          document.documentElement.style.setProperty('--color-secundario', configGlobal.colorSecondary);
          document.getElementById('config-color-secundario').value = configGlobal.colorSecondary;
        }
        if (configGlobal.colorAccent) {
          document.documentElement.style.setProperty('--color-acento', configGlobal.colorAccent);
          document.getElementById('config-color-acento').value = configGlobal.colorAccent;
        }

        if (configGlobal.direccion) {
          document.getElementById('store-address-text').textContent = configGlobal.direccion;
          document.getElementById('footer-direccion-txt').innerText = configGlobal.direccion;
          document.getElementById('config-direccion').value = configGlobal.direccion;
        }
        if (configGlobal.iframeMap) {
          document.getElementById('store-iframe').src = configGlobal.iframeMap;
          document.getElementById('config-iframe').value = configGlobal.iframeMap;
        }
        if (configGlobal.horarios) {
          document.getElementById('top-bar-horarios').innerHTML = `<i class="fa-regular fa-clock"></i> ${configGlobal.horarios}`;
          document.getElementById('config-horarios').value = configGlobal.horarios;
        }
        if (configGlobal.whatsapp) {
          document.getElementById('hero-btn-wa').href = configGlobal.whatsapp;
          document.getElementById('btn-pedir-wa').href = `${configGlobal.whatsapp}?text=Hola,%20busco%20un%20libro%20sobre%20pedido`;
          document.getElementById('footer-wa').href = configGlobal.whatsapp;
          document.getElementById('config-whatsapp').value = configGlobal.whatsapp;
        }
      });
    }

    function escucharComentarios() {
      commentsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        comentariosGlobal = [];
        if (data) {
          Object.keys(data).forEach(key => {
            comentariosGlobal.push({ id: key, ...data[key] });
          });
        }
        renderizarComentarios();
      });
    }

    // 2. RENDERING Y FILTRADO
    function renderizarCatalogo() {
      const container = document.getElementById('book-list');
      const busqueda = document.getElementById('search-input').value.toLowerCase().trim();
      const orden = document.getElementById('control-ordenar').value;
      const precioMax = parseFloat(document.getElementById('control-precio-rango').value);

      let listaOrigen = filtroNovedadesActivo ? librosGlobal.slice(-8).reverse() : librosGlobal;

      let filtrados = listaOrigen.filter(libro => {
        const coincideCat = (categoriaActiva === 'Todas') || (libro.categoria && libro.categoria.includes(categoriaActiva));
        const coincideBusqueda = (libro.titulo && libro.titulo.toLowerCase().includes(busqueda)) || 
                                 (libro.autor && libro.autor.toLowerCase().includes(busqueda)) ||
                                 (libro.categoria && libro.categoria.toLowerCase().includes(busqueda));
        const precioValido = parseFloat(libro.precio || 0) <= precioMax;
        return coincideCat && coincideBusqueda && precioValido;
      });

      if (orden === 'price-asc') filtrados.sort((a,b) => parseFloat(a.precio) - parseFloat(b.precio));
      if (orden === 'price-desc') filtrados.sort((a,b) => parseFloat(b.precio) - parseFloat(a.precio));
      if (orden === 'alpha') filtrados.sort((a,b) => (a.titulo || '').localeCompare(b.titulo || ''));

      container.innerHTML = '';
      if (filtrados.length === 0) {
        container.innerHTML = `<div class="no-results">No se encontraron libros que coincidan con el criterio.</div>`;
        return;
      }

      const waBase = configGlobal.whatsapp || "https://wa.me/5217220000000";

      filtrados.forEach(libro => {
        const estadoClase = libro.estado === 'Disponible' ? 'available' : 'not-available';
        const msgWa = encodeURIComponent(`Hola, quiero apartar el libro "${libro.titulo}" de ${libro.autor}.`);
        
        const card = document.createElement('div');
        card.className = 'book';
        card.onclick = () => abrirVistaRapida(libro);
        card.innerHTML = `
          <div class="book-image-container">
            <img src="${libro.imagen || 'https://via.placeholder.com/150x220'}" alt="${libro.titulo}">
          </div>
          <h4>${libro.titulo}</h4>
          <p class="book-author">${libro.autor}</p>
          <p class="book-resume">${libro.resumen || 'Sin descripción disponible.'}</p>
          <div class="book-details">
            <div class="categories-tag-group">
              <span class="book-category">${libro.categoria || 'General'}</span>
            </div>
            <span class="book-availability ${estadoClase}">${libro.estado || 'Disponible'}</span>
          </div>
          <div class="book-footer-row" onclick="event.stopPropagation()">
            <span class="book-price">$${parseFloat(libro.precio || 0).toFixed(2)}</span>
            <a href="${waBase}?text=${msgWa}" target="_blank" class="btn-order-wa"><i class="fa-brands fa-whatsapp"></i> Apartar</a>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // 3. CATEGORÍAS & NOVEDADES
    function toggleFiltroNovedades() {
      filtroNovedadesActivo = !filtroNovedadesActivo;
      const btn = document.getElementById('btn-filtro-novedades');
      
      if (filtroNovedadesActivo) {
        btn.classList.add('active');
        mostrarToast("Mostrando sólo novedades recientes");
      } else {
        btn.classList.remove('active');
      }
      renderizarCatalogo();
    }

    function actualizarCategoriasDinamicas() {
      const container = document.getElementById('categories-filter-box');
      const categoriasMap = {};

      librosGlobal.forEach(l => {
        if (l.categoria) {
          const cats = l.categoria.split(',');
          cats.forEach(c => {
            const trimmed = c.trim();
            if (trimmed) categoriasMap[trimmed] = (categoriasMap[trimmed] || 0) + 1;
          });
        }
      });

      container.innerHTML = `
        <button class="category-btn ${categoriaActiva === 'Todas' ? 'active' : ''}" onclick="seleccionarCategoria('Todas')">
          Todas <span class="cat-count-badge">${librosGlobal.length}</span>
        </button>
      `;

      Object.keys(categoriasMap).forEach(cat => {
        container.innerHTML += `
          <button class="category-btn ${categoriaActiva === cat ? 'active' : ''}" onclick="seleccionarCategoria('${cat}')">
            ${cat} <span class="cat-count-badge">${categoriasMap[cat]}</span>
          </button>
        `;
      });
    }

    function seleccionarCategoria(cat) {
      categoriaActiva = cat;
      document.getElementById('cat-selected-label').textContent = `(${cat})`;
      actualizarCategoriasDinamicas();
      renderizarCatalogo();
      document.getElementById('dropdown-categories-menu').classList.remove('show');
    }

    function toggleDropdownCategorias() {
      document.getElementById('dropdown-categories-menu').classList.toggle('show');
    }

    function filtrarCatalogo() { renderizarCatalogo(); }

    function actualizarTextoPrecio(val) {
      document.getElementById('texto-precio-max').textContent = `$${val}`;
      renderizarCatalogo();
    }

    // 4. CARRUSEL
    function renderizarCarrusel() {
      const carrusel = document.getElementById('new-books-carousel');
      carrusel.innerHTML = '';
      const recientes = librosGlobal.slice(-8).reverse();

      recientes.forEach(libro => {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.onclick = () => abrirVistaRapida(libro);
        item.innerHTML = `
          <div class="carousel-item-img-box">
            <img src="${libro.imagen}" alt="${libro.titulo}">
          </div>
          <h4>${libro.titulo}</h4>
        `;
        carrusel.appendChild(item);
      });
    }

    function moveCarousel(direction) {
      const carousel = document.getElementById('new-books-carousel');
      carruselPosicion += direction * 220;
      const maxScroll = -(carousel.scrollWidth - carousel.parentElement.clientWidth);
      if (carruselPosicion < maxScroll) carruselPosicion = 0;
      if (carruselPosicion > 0) carruselPosicion = maxScroll;
      carousel.style.transform = `translateX(${carruselPosicion}px)`;
    }

    function iniciarCarruselAuto() { carruselInterval = setInterval(() => moveCarousel(-1), 4000); }
    function pausarCarrusel() { clearInterval(carruselInterval); }
    function reanudarCarrusel() { iniciarCarruselAuto(); }

    // 5. RESEÑAS
    function renderizarComentarios() {
      const container = document.getElementById('comments-container');
      container.innerHTML = '';

      if (comentariosGlobal.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">Aún no hay opiniones registradas. ¡Sé el primero en compartir la tuya!</p>`;
        return;
      }

      comentariosGlobal.slice().reverse().forEach(c => {
        const estrellasHtml = '<i class="fa-solid fa-star"></i>'.repeat(c.rating || 5);
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.innerHTML = `
          <div class="stars">${estrellasHtml}</div>
          <p>"${c.texto}"</p>
          <div class="testimonial-author">- ${c.autor}</div>
        `;
        container.appendChild(card);
      });
    }

    function guardarComentario(e) {
      e.preventDefault();
      const autor = document.getElementById('comment-author').value.trim();
      const texto = document.getElementById('comment-text').value.trim();
      const rating = parseInt(document.getElementById('comment-rating').value);

      if (!autor || !texto) return;

      commentsRef.push({
        autor: autor,
        texto: texto,
        rating: rating,
        fecha: new Date().toISOString()
      }).then(() => {
        mostrarToast("¡Gracias por tu reseña!");
        document.getElementById('public-comment-form').reset();
      }).catch(err => mostrarToast("Error al publicar: " + err.message));
    }

    // 6. VISTA RÁPIDA
    function abrirVistaRapida(libro) {
      document.getElementById('qv-img').src = libro.imagen;
      document.getElementById('qv-title').textContent = libro.titulo;
      document.getElementById('qv-author').textContent = `Por: ${libro.autor}`;
      document.getElementById('qv-resume').textContent = libro.resumen || 'Sin resumen disponible.';
      document.getElementById('qv-price').textContent = `$${parseFloat(libro.precio).toFixed(2)}`;
      
      const waBase = configGlobal.whatsapp || "https://wa.me/5217220000000";
      const msgWa = encodeURIComponent(`Hola, me interesa apartar "${libro.titulo}" de ${libro.autor}.`);
      document.getElementById('qv-btn-wa').href = `${waBase}?text=${msgWa}`;
      
      document.getElementById('quickview-modal').style.display = 'block';
    }

    function cerrarVistaRapida(e, forzar = false) {
      if (forzar || e.target.id === 'quickview-modal') {
        document.getElementById('quickview-modal').style.display = 'none';
      }
    }

    // 7. ADMINISTRACIÓN Y CONTROL DE INVENTARIO
    function solicitarAccesoAdmin() {
      const pass = prompt("Ingrese la clave de administración:");
      if (pass === "milenium2026") {
        document.getElementById('admin-overlay').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'block';
      } else if (pass !== null) {
        mostrarToast("Contraseña incorrecta");
      }
    }

    function cerrarAdminPanel() {
      document.getElementById('admin-overlay').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'none';
    }

    function guardarEstilosYLogos(e) {
      e.preventDefault();
      const nuevosEstilos = {
        logoLeft: document.getElementById('config-logo-left').value.trim(),
        logoRight: document.getElementById('config-logo-right').value.trim(),
        colorPrimary: document.getElementById('config-color-primario').value,
        colorSecondary: document.getElementById('config-color-secundario').value,
        colorAccent: document.getElementById('config-color-acento').value
      };

      configRef.update(nuevosEstilos).then(() => {
        mostrarToast("Estilos visuales actualizados");
      }).catch(err => mostrarToast("Error al guardar: " + err.message));
    }

    function guardarConfiguracionSitio(e) {
      e.preventDefault();
      const configData = {
        direccion: document.getElementById('config-direccion').value.trim(),
        iframeMap: document.getElementById('config-iframe').value.trim(),
        horarios: document.getElementById('config-horarios').value.trim(),
        whatsapp: document.getElementById('config-whatsapp').value.trim(),
        facebook: document.getElementById('config-facebook').value.trim(),
        instagram: document.getElementById('config-instagram').value.trim()
      };

      configRef.update(configData).then(() => {
        mostrarToast("Ajustes guardados correctamente");
      }).catch(err => mostrarToast("Error al guardar: " + err.message));
    }

    function actualizarEstadisticasAdmin() {
      const total = librosGlobal.length;
      const disponibles = librosGlobal.filter(l => l.estado === 'Disponible').length;
      const sumaValor = librosGlobal.reduce((acc, l) => acc + parseFloat(l.precio || 0), 0);

      document.getElementById('stat-total-books').textContent = total;
      document.getElementById('stat-available-books').textContent = disponibles;
      document.getElementById('stat-total-value').textContent = `$${sumaValor.toFixed(2)}`;
    }

    function guardarLibro(e) {
      e.preventDefault();
      const id = document.getElementById('edit-book-id').value;
      const libroData = {
        titulo: document.getElementById('input-title').value.trim(),
        autor: document.getElementById('input-author').value.trim(),
        precio: parseFloat(document.getElementById('input-price').value),
        categoria: document.getElementById('input-category').value.trim(),
        estado: document.getElementById('input-status').value,
        imagen: document.getElementById('input-image').value.trim(),
        resumen: document.getElementById('input-resume').value.trim()
      };

      if (id) {
        booksRef.child(id).update(libroData).then(() => {
          mostrarToast("Libro actualizado");
          resetFormulario();
        });
      } else {
        booksRef.push(libroData).then(() => {
          mostrarToast("Libro registrado en inventario");
          resetFormulario();
        });
      }
    }

    function renderizarTablaAdmin(filtro = '') {
      const tbody = document.getElementById('admin-table-body');
      tbody.innerHTML = '';
      
      const filtrados = librosGlobal.filter(l => 
        l.titulo.toLowerCase().includes(filtro.toLowerCase()) || 
        l.autor.toLowerCase().includes(filtro.toLowerCase()) ||
        (l.categoria && l.categoria.toLowerCase().includes(filtro.toLowerCase()))
      );

      filtrados.forEach(libro => {
        tbody.innerHTML += `
          <tr>
            <td><img src="${libro.imagen}" class="tbl-thumb"></td>
            <td><strong>${libro.titulo}</strong><br><small>${libro.autor}</small></td>
            <td><span class="book-category">${libro.categoria || 'General'}</span></td>
            <td>$${parseFloat(libro.precio).toFixed(2)}</td>
            <td><span style="color:${libro.estado==='Disponible'?'#10b981':'#ef4444'}; font-weight:600;">${libro.estado}</span></td>
            <td class="action-btns">
              <button class="edit-btn" onclick="cargarEdicion('${libro.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
              <button class="delete-btn" onclick="eliminarLibro('${libro.id}')"><i class="fa-solid fa-trash"></i> Borrar</button>
            </td>
          </tr>
        `;
      });
    }

    function filtrarTablaAdmin() {
      const val = document.getElementById('admin-search-tbl').value;
      renderizarTablaAdmin(val);
    }

    function cargarEdicion(id) {
      const libro = librosGlobal.find(l => l.id === id);
      if (!libro) return;
      document.getElementById('edit-book-id').value = id;
      document.getElementById('input-title').value = libro.titulo;
      document.getElementById('input-author').value = libro.autor;
      document.getElementById('input-price').value = libro.precio;
      document.getElementById('input-category').value = libro.categoria;
      document.getElementById('input-status').value = libro.estado;
      document.getElementById('input-image').value = libro.imagen;
      document.getElementById('input-resume').value = libro.resumen;
      document.getElementById('admin-form-title').textContent = "Editar Libro Seleccionado";
      
      document.getElementById('admin-panel').scrollTo({ top: 0, behavior: 'smooth' });
    }

    function eliminarLibro(id) {
      if (confirm("¿Deseas eliminar este ejemplar del catálogo?")) {
        booksRef.child(id).remove().then(() => mostrarToast("Libro eliminado"));
      }
    }

    function resetFormulario() {
      document.getElementById('book-form').reset();
      document.getElementById('edit-book-id').value = '';
      document.getElementById('admin-form-title').textContent = "Agregar Nuevo Libro";
    }

    // UTILERÍAS Y EFECTOS
    function toggleTheme() {
      const body = document.body;
      const isDark = body.getAttribute('data-theme') === 'dark';
      body.setAttribute('data-theme', isDark ? 'light' : 'dark');
      document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    function mostrarToast(msg) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function cargarFondoAnimado() {
      const canvas = document.getElementById('background-canvas');
      const ctx = canvas.getContext('2d');
      let width = canvas.width = window.innerWidth;
      let height = canvas.height = window.innerHeight;

      const particles = Array.from({ length: 25 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 14 + 10,
        speedY: -(Math.random() * 0.5 + 0.2),
        opacity: Math.random() * 0.5 + 0.2
      }));

      function draw() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          ctx.fillStyle = `rgba(30, 60, 114, ${p.opacity})`;
          ctx.font = `${p.size}px FontAwesome`;
          ctx.fillText('📖', p.x, p.y);
          p.y += p.speedY;
          if (p.y < -20) p.y = height + 20;
        });
        requestAnimationFrame(draw);
      }
      draw();
      window.onresize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    }
