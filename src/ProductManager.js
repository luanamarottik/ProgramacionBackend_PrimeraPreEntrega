const fs = require('fs').promises;

class ProductManager {
    constructor(filePath) {
        this.products = [];
        this.productIdCounter = 1;
        this.path = filePath; // Ruta del archivo

        // Cargar datos del archivo (si existe)
        this.loadFromFile();
    }

    async addProduct(title, description, price, thumbnail, code, stock) {
        if (!title || !description || !price || !thumbnail || !code || !stock) {
            console.log("Todos los campos son obligatorios.");
            return;
        }

        const existingProduct = this.products.find(product => product.code === code);
        if (existingProduct) {
            console.log("El código de producto ya existe.");
            return;
        }

        const newProduct = {
            id: this.productIdCounter,
            title: title,
            description: description,
            price: price,
            thumbnail: thumbnail,
            code: code,
            stock: stock
        };
        this.products.push(newProduct);
        this.productIdCounter++;
        console.log("Producto agregado correctamente.");

        await this.saveToFile();
    }

    async deleteProduct(productId) {
        const indexToDelete = this.products.findIndex(product => product.id === productId);
        if (indexToDelete !== -1) {
            this.products.splice(indexToDelete, 1);
            await this.saveToFile();
            console.log(`Producto con ID ${productId} eliminado correctamente.`);
        } else {
            console.log(`No se encontró ningún producto con ID ${productId}.`);
        }
    }

    async updateProduct(productId, updatedFields) {
        const productToUpdate = this.products.find(product => product.id === productId);
        if (productToUpdate) {
            const updatedProduct = { ...productToUpdate, ...updatedFields };
            const indexToUpdate = this.products.findIndex(product => product.id === productId);
            this.products[indexToUpdate] = updatedProduct;
            await this.saveToFile();
            console.log(`Producto con ID ${productId} actualizado correctamente.`);
        } else {
            console.log(`No se encontró ningún producto con ID ${productId}.`);
        }
    }

    // Cargar datos desde el archivo de forma asíncrona
    async loadFromFile() {
        try {
            const data = await fs.readFile(this.path, 'utf8');
            this.products = JSON.parse(data);
            this.updateProductIdCounter();
            console.log("Datos cargados desde el archivo.");
        } catch (err) {
            console.error("Error al cargar el archivo:", err.message);
        }
    }

    // Guardar datos en el archivo de forma asíncrona
    async saveToFile() {
        try {
            await fs.writeFile(this.path, JSON.stringify(this.products, null, 2));
            console.log("Datos guardados en el archivo.");
        } catch (err) {
            console.error("Error al guardar en el archivo:", err.message);
        }
    }

    // Actualizar el contador de ID basado en los productos actuales
    updateProductIdCounter() {
        const lastProduct = this.products[this.products.length - 1];
        if (lastProduct) {
            this.productIdCounter = lastProduct.id + 1;
        }
    }
}

module.exports = ProductManager;
