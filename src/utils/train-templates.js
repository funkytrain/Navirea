/**
 * Templates predefinidos de modelos de tren
 * Proporcionan configuraciones comunes para facilitar la creación de nuevos modelos
 */

const TrainTemplates = {
  /**
   * Retorna la lista de todos los templates disponibles
   * @returns {Array} Array de templates
   */
  getAll() {
    return [
      this.getTemplate('regional-3-coaches'),
      this.getTemplate('suburban-4-coaches'),
      this.getTemplate('intercity-2-coaches'),
      this.getTemplate('regional-accessibility'),
      this.getTemplate('custom-blank')
    ];
  },

  /**
   * Obtiene un template específico por ID
   * @param {string} templateId - ID del template
   * @returns {Object} Template
   */
  getTemplate(templateId) {
    const templates = {
      'regional-3-coaches': {
        id: 'regional-3-coaches',
        name: 'Tren Regional (3 Coches)',
        description: 'Configuración típica de tren regional con 3 coches de 4 asientos por fila',
        icon: '🚆',
        coaches: [
          {
            id: 'C1',
            name: 'Coche 1',
            layout: [
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 60 },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'seats', positions: [[17, 18, null, 19, 20]] },
              { type: 'space', height: 40 },
              { type: 'special', positions: [[null, 'WC', null, 'EQ', null]] }
            ]
          },
          {
            id: 'C2',
            name: 'Coche 2',
            layout: [
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 60 },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'seats', positions: [[17, 18, null, 19, 20]] },
              { type: 'seats', positions: [[21, 22, null, 23, 24]] },
              { type: 'space', height: 40 }
            ]
          },
          {
            id: 'C3',
            name: 'Coche 3',
            layout: [
              { type: 'special', positions: [['EQ', null, null, null, null]] },
              { type: 'space', height: 40 },
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 60 },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'seats', positions: [[17, 18, null, 19, 20]] }
            ]
          }
        ]
      },

      'suburban-4-coaches': {
        id: 'suburban-4-coaches',
        name: 'Tren Suburbano (4 Coches)',
        description: 'Tren suburbano de alta capacidad con 4 coches y disposición 3+2',
        icon: '🚇',
        coaches: [
          {
            id: 'C1',
            name: 'Coche 1',
            layout: [
              { type: 'seats', positions: [[1, 2, 3, null, 4, 5]] },
              { type: 'seats', positions: [[6, 7, 8, null, 9, 10]] },
              { type: 'seats', positions: [[11, 12, 13, null, 14, 15]] },
              { type: 'space', height: 80 },
              { type: 'seats', positions: [[16, 17, 18, null, 19, 20]] },
              { type: 'seats', positions: [[21, 22, 23, null, 24, 25]] },
              { type: 'space', height: 40 },
              { type: 'special', positions: [[null, 'WC', null, null, 'EQ', null]] }
            ]
          },
          {
            id: 'C2',
            name: 'Coche 2',
            layout: [
              { type: 'seats', positions: [[1, 2, 3, null, 4, 5]] },
              { type: 'seats', positions: [[6, 7, 8, null, 9, 10]] },
              { type: 'seats', positions: [[11, 12, 13, null, 14, 15]] },
              { type: 'seats', positions: [[16, 17, 18, null, 19, 20]] },
              { type: 'space', height: 80 },
              { type: 'seats', positions: [[21, 22, 23, null, 24, 25]] },
              { type: 'seats', positions: [[26, 27, 28, null, 29, 30]] }
            ]
          },
          {
            id: 'C3',
            name: 'Coche 3',
            layout: [
              { type: 'seats', positions: [[1, 2, 3, null, 4, 5]] },
              { type: 'seats', positions: [[6, 7, 8, null, 9, 10]] },
              { type: 'space', height: 80 },
              { type: 'seats', positions: [[11, 12, 13, null, 14, 15]] },
              { type: 'seats', positions: [[16, 17, 18, null, 19, 20]] },
              { type: 'seats', positions: [[21, 22, 23, null, 24, 25]] },
              { type: 'seats', positions: [[26, 27, 28, null, 29, 30]] }
            ]
          },
          {
            id: 'C4',
            name: 'Coche 4',
            layout: [
              { type: 'special', positions: [['EQ', null, null, null, null, null]] },
              { type: 'space', height: 40 },
              { type: 'seats', positions: [[1, 2, 3, null, 4, 5]] },
              { type: 'seats', positions: [[6, 7, 8, null, 9, 10]] },
              { type: 'seats', positions: [[11, 12, 13, null, 14, 15]] },
              { type: 'space', height: 80 },
              { type: 'seats', positions: [[16, 17, 18, null, 19, 20]] },
              { type: 'seats', positions: [[21, 22, 23, null, 24, 25]] }
            ]
          }
        ]
      },

      'intercity-2-coaches': {
        id: 'intercity-2-coaches',
        name: 'Tren Intercity (2 Coches)',
        description: 'Tren intercity compacto con 2 coches y asientos confortables 2+2',
        icon: '🚄',
        coaches: [
          {
            id: 'C1',
            name: 'Coche 1',
            layout: [
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'space', height: 40 },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 100 },
              { type: 'special', positions: [[null, 'MESA', null, 'MESA', null]] },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'seats', positions: [[17, 18, null, 19, 20]] },
              { type: 'space', height: 40 },
              { type: 'special', positions: [[null, 'WC', null, 'EQ', null]] }
            ]
          },
          {
            id: 'C2',
            name: 'Coche 2',
            layout: [
              { type: 'special', positions: [['EQ', null, null, null, null]] },
              { type: 'space', height: 40 },
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'space', height: 100 },
              { type: 'special', positions: [[null, 'MESA', null, 'MESA', null]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'space', height: 40 }
            ]
          }
        ]
      },

      'regional-accessibility': {
        id: 'regional-accessibility',
        name: 'Tren Regional Accesible',
        description: 'Tren regional con espacios PMR y minusválidos distribuidos',
        icon: '♿',
        coaches: [
          {
            id: 'C1',
            name: 'Coche 1',
            layout: [
              { type: 'special', positions: [['PMR', null, null, 'PMR', null]] },
              { type: 'space', height: 80 },
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'space', height: 60 },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 40 },
              { type: 'special', positions: [[null, 'WC', null, 'MIN', null]] }
            ]
          },
          {
            id: 'C2',
            name: 'Coche 2',
            layout: [
              { type: 'seats', positions: [[1, 2, null, 3, 4]] },
              { type: 'seats', positions: [[5, 6, null, 7, 8]] },
              { type: 'seats', positions: [[9, 10, null, 11, 12]] },
              { type: 'space', height: 60 },
              { type: 'special', positions: [['PMR', null, null, 'PMR', null]] },
              { type: 'space', height: 60 },
              { type: 'seats', positions: [[13, 14, null, 15, 16]] },
              { type: 'space', height: 40 },
              { type: 'special', positions: [['EQ', null, null, 'MIN', null]] }
            ]
          }
        ]
      },

      'custom-blank': {
        id: 'custom-blank',
        name: 'Modelo en Blanco',
        description: 'Comienza desde cero con un modelo completamente vacío',
        icon: '📄',
        coaches: [
          {
            id: 'C1',
            name: 'Coche 1',
            layout: []
          }
        ]
      }
    };

    return templates[templateId] || templates['custom-blank'];
  },

  /**
   * Crea un nuevo modelo desde un template
   * @param {string} templateId - ID del template
   * @param {string} customName - Nombre personalizado (opcional)
   * @returns {Object} Nuevo modelo basado en el template
   */
  createFromTemplate(templateId, customName) {
    const template = this.getTemplate(templateId);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4);

    return {
      id: `custom_${timestamp}_${random}`,
      name: customName || template.name,
      custom: true,
      createdAt: new Date().toISOString(),
      templateId: templateId,
      coaches: JSON.parse(JSON.stringify(template.coaches)) // Deep clone
    };
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.TrainTemplates = TrainTemplates;
}
