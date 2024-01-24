const express = require('express');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs').promises;

class ProductManager {
    constructor(filePath) {
        this.products = [];
        this.productIdCounter = 1;
        this.path = filePath;

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

    async saveToFile() {
        try {
            await fs.writeFile(this.path, JSON.stringify(this.products, null, 2));
            console.log("Datos guardados en el archivo.");
        } catch (err) {
            console.error("Error al guardar en el archivo:", err.message);
        }
    }

    updateProductIdCounter() {
        const lastProduct = this.products[this.products.length - 1];
        if (lastProduct) {
            this.productIdCounter = lastProduct.id + 1;
        }
    }
    
    async renderProductsPage(req, res) {
        const limit = parseInt(req.query.limit);

        let productsToRender = this.products;

        if (!isNaN(limit) && limit > 0) {
            productsToRender = productsToRender.slice(0, limit);
        }

        res.render('products', { products: productsToRender });
    }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Handlebars como motor de plantillas
app.engine('handlebars', handlebars({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Rutas estáticas
app.use(express.static('public'));

// Instancia del ProductManager
const productManager = new ProductManager('productos.json');
const carts = [];

// Rutas para la API de productos
app.get('/api/products', async (req, res) => {
    productManager.renderProductsPage(req, res);
});

app.get('/api/products/:pid', async (req, res) => {
    const productId = parseInt(req.params.pid);
    const product = productManager.products.find(product => product.id === productId);

    if (product) {
        res.render('product', { product });
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.post('/api/products', async (req, res) => {
    const { title, description, price, thumbnail, code, stock } = req.body;
    await productManager.addProduct(title, description, price, thumbnail, code, stock);
    res.send('Producto agregado correctamente.');
});

app.delete('/api/products/:id', async (req, res) => {
    const productId = parseInt(req.params.id);
    await productManager.deleteProduct(productId);
    res.send(`Producto con ID ${productId} eliminado correctamente.`);
});

app.put('/api/products/:id', async (req, res) => {
    const productId = parseInt(req.params.id);
    const updatedFields = req.body;
    await productManager.updateProduct(productId, updatedFields);
    res.send(`Producto con ID ${productId} actualizado correctamente.`);
});

// Rutas para la API de carritos
app.post('/api/carts', (req, res) => {
    const newCart = {
        id: generateUniqueId(),
        products: []
    };

    carts.push(newCart);

    res.json({ message: 'Nuevo carrito creado', cart: newCart });
});

app.get('/api/carts/:cid', (req, res) => {
    const cartId = req.params.cid;
    const cart = carts.find(cart => cart.id === cartId);

    if (cart) {
        res.json({ cart });
    } else {
        res.status(404).json({ error: 'Carrito no encontrado' });
    }
});

app.get('/', async (req, res) => {
    productManager.renderProductsPage(req, res);
});

app.get('/realtimeproducts', async (req, res) => {
    res.render('realTimeProducts', { products: productManager.products });
});

app.post('/api/carts/:cid/product/:pid', (req, res) => {
    const cartId = req.params.cid;
    const productId = parseInt(req.params.pid);
    const quantity = parseInt(req.body.quantity) || 1;

    const cart = carts.find(cart => cart.id === cartId);
    const product = productManager.products.find(product => product.id === productId);

    if (!cart || !product) {
        return res.status(404).json({ error: 'Carrito o producto no encontrado' });
    }

    const existingProduct = cart.products.find(item => item.product === productId);

    if (existingProduct) {
        existingProduct.quantity += quantity;
    } else {
        cart.products.push({
            product: productId,
            quantity: quantity
        });
    }

    res.json({ message: 'Producto agregado al carrito correctamente', cart });
});

// Función para generar un ID único
function generateUniqueId() {
    return Math.floor(Math.random() * 1000000).toString();
}

// Configuración de Socket.IO
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Enviar la lista de productos cuando se establece la conexión
    socket.emit('updateProductList', productManager.products);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Escuchar eventos para actualizaciones en tiempo real
    socket.on('newProduct', (newProduct) => {
        productManager.products.push(newProduct);
        io.emit('updateProductList', productManager.products);
    });

    socket.on('deleteProduct', (productId) => {
        productManager.deleteProduct(productId);
        io.emit('updateProductList', productManager.products);
    });
    
});


// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});
