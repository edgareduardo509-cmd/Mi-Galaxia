import * as THREE from 'three';

export async function cargarPalabras() {
    try {
        const respuesta = await fetch('palabras.txt');
        if (!respuesta.ok) throw new Error();
        const texto = await respuesta.text();
        return texto.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    } catch (e) {
        // Lista de respaldo por si el navegador bloquea la lectura local del archivo sin un servidor activo
        return ['Amor', 'Mi Reina', 'Siempre', 'Universo', 'Cariño', 'Vida', 'Felicidad', 'Mi Sol', 'Te Amo', 'Mi Paz'];
    }
}

export function crearTexturaPalabra(texto, colorBase = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 512;
    canvas.height = 128;

    // Efecto de brillo (Glow) en el texto
    ctx.shadowColor = colorBase;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colorBase;
    ctx.font = 'Bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(texto, canvas.width / 2, canvas.height / 2);

    const textura = new THREE.CanvasTexture(canvas);
    textura.minFilter = THREE.LinearFilter;
    return textura;
}