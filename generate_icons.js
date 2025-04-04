const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to draw icon
function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(0, 0, size, size);
  
  // Speech bubble
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size*0.35, 0, Math.PI*2);
  ctx.fill();
  
  // Speech bubble tail
  ctx.beginPath();
  ctx.moveTo(size*0.65, size*0.65);
  ctx.lineTo(size*0.8, size*0.8);
  ctx.lineTo(size*0.55, size*0.7);
  ctx.fill();
  
  // Sound waves
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size*0.05;
  
  // First wave
  ctx.beginPath();
  ctx.arc(size*0.5, size*0.5, size*0.5, -Math.PI*0.3, Math.PI*0.3);
  ctx.stroke();
  
  // Second wave
  ctx.beginPath();
  ctx.arc(size*0.5, size*0.5, size*0.6, -Math.PI*0.2, Math.PI*0.2);
  ctx.stroke();
}

// Create icons
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`extension/popup/images/icon${size}.png`, buffer);
  
  console.log(`Created icon${size}.png`);
});

console.log('All icons generated successfully!');
