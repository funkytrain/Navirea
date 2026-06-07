/* ============================================
   CREW MODULE - Agenda de tripulación
   ============================================ */

const CREW_STORAGE_KEY = 'navirea_crew_contacts';

// Roles disponibles
const CREW_ROLES = {
    maquinista: 'Maquinista',
    interventor: 'Interventor Auxiliar'
};

// ---- Storage ----

function loadCrewContacts() {
    try {
        const raw = localStorage.getItem(CREW_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveCrewContacts(contacts) {
    try {
        localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
        console.warn('Error guardando tripulación', e);
    }
}

function addCrewContact(name, phone, role) {
    const contacts = loadCrewContacts();
    const contact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
        role
    };
    contacts.push(contact);
    saveCrewContacts(contacts);
    return contact;
}

function deleteCrewContact(id) {
    const contacts = loadCrewContacts().filter(c => c.id !== id);
    saveCrewContacts(contacts);
}

function updateCrewContact(id, name, phone, role) {
    const contacts = loadCrewContacts().map(c =>
        c.id === id ? { ...c, name: name.trim(), phone: phone.trim(), role } : c
    );
    saveCrewContacts(contacts);
}

// ---- Llamadas ----

function callCrewMember(phone) {
    // Limpiar el número: dejar solo dígitos y el + inicial
    const clean = phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${clean}`;
}

// ---- UI ----

function openCrewModal() {
    if (document.querySelector('.crew-modal-overlay')) return;
    renderCrewModal();
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function closeCrewModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.querySelector('.crew-modal-overlay');
    if (overlay) overlay.remove();
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    // Cerrar el formulario de edición inline si estaba abierto
    _editingId = null;
}

function renderCrewModal() {
    const existing = document.querySelector('.crew-modal-overlay');
    if (existing) existing.remove();

    const contacts = loadCrewContacts();
    const maquinistas = contacts.filter(c => c.role === 'maquinista');
    const interventores = contacts.filter(c => c.role === 'interventor');

    const svgPhone = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.42 13.46a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.31a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.28 17.72l.64-.8z"/></svg>`;
    const svgEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const svgTrash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    const svgClose = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    function renderGroup(title, groupContacts, role) {
        const items = groupContacts.map(c => `
            <div class="crew-contact-item" data-id="${c.id}">
                <div class="crew-contact-info">
                    <span class="crew-contact-name">${escapeHtml(c.name)}</span>
                    <span class="crew-contact-phone">${escapeHtml(c.phone)}</span>
                </div>
                <div class="crew-contact-actions">
                    <button class="crew-btn crew-btn-call" onclick="callCrewMember('${escapeHtml(c.phone)}')" title="Llamar">
                        ${svgPhone}
                    </button>
                    <button class="crew-btn crew-btn-edit" onclick="openEditCrewContact('${c.id}')" title="Editar">
                        ${svgEdit}
                    </button>
                    <button class="crew-btn crew-btn-delete" onclick="confirmDeleteCrewContact('${c.id}')" title="Eliminar">
                        ${svgTrash}
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="crew-group">
                <div class="crew-group-header">
                    <span class="crew-group-title">${title}</span>
                    <button class="crew-add-btn" onclick="openAddCrewContact('${role}')" title="Añadir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Añadir
                    </button>
                </div>
                <div class="crew-contact-list" id="crew-list-${role}">
                    ${items.length ? items : '<p class="crew-empty">Sin contactos guardados</p>'}
                </div>
                <div class="crew-form-container" id="crew-form-${role}" style="display:none;"></div>
            </div>
        `;
    }

    const html = `
        <div class="crew-modal-overlay" onclick="closeCrewModal(event)">
            <div class="modal crew-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Tripulación</h3>
                        <button class="close-btn" onclick="closeCrewModal()">${svgClose}</button>
                    </div>
                </div>
                <div class="crew-modal-body">
                    ${renderGroup('Maquinistas', maquinistas, 'maquinista')}
                    ${renderGroup('Interventores auxiliares', interventores, 'interventor')}
                </div>
                <div class="crew-modal-footer">
                    <button class="crew-footer-btn" onclick="importCrewContacts()" title="Importar contactos desde JSON">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Importar
                    </button>
                    <button class="crew-footer-btn" onclick="exportCrewContacts()" title="Exportar contactos a JSON">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Exportar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

// ID del contacto que se está editando actualmente
let _editingId = null;

function openAddCrewContact(role) {
    _editingId = null;
    const container = document.getElementById(`crew-form-${role}`);
    if (!container) return;

    // Cerrar otros formularios abiertos
    document.querySelectorAll('.crew-form-container').forEach(el => {
        if (el !== container) { el.style.display = 'none'; el.innerHTML = ''; }
    });

    container.style.display = 'block';
    container.innerHTML = buildContactForm(null, role);
    container.querySelector('.crew-form-name')?.focus();
}

function openEditCrewContact(id) {
    const contacts = loadCrewContacts();
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    _editingId = id;
    const container = document.getElementById(`crew-form-${contact.role}`);
    if (!container) return;

    // Cerrar otros formularios
    document.querySelectorAll('.crew-form-container').forEach(el => {
        if (el !== container) { el.style.display = 'none'; el.innerHTML = ''; }
    });

    container.style.display = 'block';
    container.innerHTML = buildContactForm(contact, contact.role);
    container.querySelector('.crew-form-name')?.focus();
}

function buildContactForm(contact, role) {
    const isEdit = !!contact;
    return `
        <div class="crew-form">
            <input type="text" class="crew-form-name" placeholder="Nombre"
                   value="${contact ? escapeHtml(contact.name) : ''}"
                   maxlength="60" autocomplete="off" />
            <div class="crew-form-phone-row">
                <input type="tel" class="crew-form-phone" placeholder="Teléfono"
                       value="${contact ? escapeHtml(contact.phone) : ''}"
                       maxlength="20" autocomplete="off" inputmode="tel" />
                <button class="crew-btn-picker" onclick="tryContactPicker('${role}')" title="Buscar en contactos del dispositivo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </button>
            </div>
            <div class="crew-form-btns">
                <button class="crew-form-cancel" onclick="cancelCrewForm('${role}')">Cancelar</button>
                <button class="crew-form-save" onclick="saveCrewForm('${role}', ${isEdit ? `'${contact.id}'` : 'null'})">
                    ${isEdit ? 'Guardar cambios' : 'Añadir'}
                </button>
            </div>
        </div>
    `;
}

function cancelCrewForm(role) {
    const container = document.getElementById(`crew-form-${role}`);
    if (container) { container.style.display = 'none'; container.innerHTML = ''; }
    _editingId = null;
}

function saveCrewForm(role, id) {
    const container = document.getElementById(`crew-form-${role}`);
    if (!container) return;

    const name = container.querySelector('.crew-form-name')?.value?.trim();
    const phone = container.querySelector('.crew-form-phone')?.value?.trim();

    if (!name) { alert('Escribe el nombre del contacto.'); return; }
    if (!phone) { alert('Escribe el número de teléfono.'); return; }

    if (id) {
        updateCrewContact(id, name, phone, role);
    } else {
        addCrewContact(name, phone, role);
    }

    // Cerrar formulario y redibujar el modal
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    renderCrewModal();
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function confirmDeleteCrewContact(id) {
    const contacts = loadCrewContacts();
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    if (!confirm(`¿Eliminar a "${contact.name}" de la agenda?`)) return;
    deleteCrewContact(id);
    renderCrewModal();
}

// ---- Exportar / Importar ----

function exportCrewContacts() {
    const contacts = loadCrewContacts();
    if (!contacts.length) {
        alert('No hay contactos que exportar.');
        return;
    }
    const payload = { navirea_crew: true, version: 1, contacts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `navirea-tripulacion-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importCrewContacts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.navirea_crew || !Array.isArray(data.contacts)) {
                    alert('El archivo no es un fichero de tripulación de Navirea.');
                    return;
                }
                const existing = loadCrewContacts();
                const existingPhones = new Set(existing.map(c => c.phone.replace(/\s/g, '')));
                let added = 0;
                for (const c of data.contacts) {
                    if (!c.name || !c.phone || !c.role) continue;
                    const normalizedPhone = c.phone.replace(/\s/g, '');
                    if (existingPhones.has(normalizedPhone)) continue;
                    existing.push({ id: Date.now().toString() + Math.random(), name: c.name, phone: c.phone, role: c.role });
                    existingPhones.add(normalizedPhone);
                    added++;
                }
                saveCrewContacts(existing);
                renderCrewModal();
                if (typeof lockBodyScroll === 'function') lockBodyScroll();
                if (added === 0) {
                    alert('Todos los contactos del archivo ya existen en tu agenda (mismos números de teléfono).');
                } else {
                    alert(`${added} contacto${added > 1 ? 's' : ''} importado${added > 1 ? 's' : ''} correctamente.`);
                }
            } catch {
                alert('Error al leer el archivo. Asegúrate de que es un JSON válido.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Contact Picker API (solo Chrome Android, uso opcional)
async function tryContactPicker(role) {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        alert('Tu dispositivo no soporta el selector de contactos.\nIntroduce el número manualmente.');
        return;
    }
    try {
        const props = ['name', 'tel'];
        const [picked] = await navigator.contacts.select(props, { multiple: false });
        if (!picked) return;

        const container = document.getElementById(`crew-form-${role}`);
        if (!container) return;

        const nameInput = container.querySelector('.crew-form-name');
        const phoneInput = container.querySelector('.crew-form-phone');

        if (nameInput && picked.name?.[0]) nameInput.value = picked.name[0];
        if (phoneInput && picked.tel?.[0]) phoneInput.value = picked.tel[0];
    } catch (e) {
        if (e.name !== 'AbortError') {
            alert('No se pudo acceder a los contactos.');
        }
    }
}

function clearCrewContacts() {
    try {
        localStorage.removeItem(CREW_STORAGE_KEY);
    } catch (e) {
        console.warn('Error al limpiar tripulación', e);
    }
}

// Exponer al scope global
Object.assign(window, {
    openCrewModal,
    closeCrewModal,
    callCrewMember,
    openAddCrewContact,
    openEditCrewContact,
    cancelCrewForm,
    saveCrewForm,
    confirmDeleteCrewContact,
    tryContactPicker,
    exportCrewContacts,
    importCrewContacts,
    clearCrewContacts
});
