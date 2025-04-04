// Utility functions
const Utils = {
  // Debounce function to limit how often a function can be called
  debounce: function(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  },
  
  // Generate a unique ID
  generateId: function() {
    return '_' + Math.random().toString(36).substr(2, 9);
  },
  
  // Convert image to base64
  imageToBase64: function(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg');
  },
  
  // Check if an element is visible in viewport
  isInViewport: function(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
};
