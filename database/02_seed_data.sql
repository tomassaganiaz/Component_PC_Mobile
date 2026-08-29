-- =====================================================
-- ERS - Electronic Resale System
-- Seed Data - Datos de prueba
-- =====================================================

-- =====================================================
-- USERS (10 usuarios)
-- =====================================================

-- Admin
INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Admin ERS', 'admin@ers.com', '$2b$10$hashedpassword1', '+54 11 1234-5678', 'admin', true);

-- Sellers
INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Carlos Tech', 'carlos@tech.com', '$2b$10$hashedpassword2', '+54 11 2345-6789', 'seller', true),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'María Hardware', 'maria@hardware.com', '$2b$10$hashedpassword3', '+54 11 3456-7890', 'seller', true),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Juan Components', 'juan@components.com', '$2b$10$hashedpassword4', '+54 11 4567-8901', 'seller', true),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Ana Digital', 'ana@digital.com', '$2b$10$hashedpassword5', '+54 11 5678-9012', 'seller', true);

-- Buyers
INSERT INTO users (id, name, email, password, phone, role, is_active) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Pedro Gamer', 'pedro@gamer.com', '$2b$10$hashedpassword6', '+54 11 6789-0123', 'buyer', true),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Laura PC', 'laura@pc.com', '$2b$10$hashedpassword7', '+54 11 7890-1234', 'buyer', true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Diego Tech', 'diego@tech.com', '$2b$10$hashedpassword8', '+54 11 8901-2345', 'buyer', true),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'Sofia Hardware', 'sofia@hardware.com', '$2b$10$hashedpassword9', '+54 11 9012-3456', 'buyer', true),
('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', 'Martín PC', 'martin@pc.com', '$2b$10$hashedpassword10', '+54 11 0123-4567', 'buyer', true);

-- =====================================================
-- CATEGORIES
-- =====================================================

INSERT INTO categories (id, name, slug, description, icon) VALUES
('10eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Procesadores', 'cpu', 'CPUs y procesadores para PC', 'cpu'),
('20eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'Tarjetas Gráficas', 'gpu', 'GPUs y tarjetas de video', 'gpu'),
('30eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Memoria RAM', 'ram', 'Módulos de memoria RAM', 'ram'),
('40eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Almacenamiento', 'storage', 'Discos duros y SSDs', 'storage'),
('50eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'Motherboards', 'motherboard', 'Placas madre', 'motherboard'),
('60eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'Fuentes', 'psu', 'Fuentes de alimentación', 'psu'),
('70eebc99-9c0b-4ef8-bb6d-6bb9bd380c07', 'Gabinetes', 'case', 'Gabinetes y cases', 'case'),
('80eebc99-9c0b-4ef8-bb6d-6bb9bd380c08', 'Refrigeración', 'cooling', 'Sistemas de refrigeración', 'cooling'),
('90eebc99-9c0b-4ef8-bb6d-6bb9bd380c09', 'Monitores', 'monitor', 'Pantallas y monitores', 'monitor'),
('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c10', 'Celulares', 'phone', 'Smartphones y celulares', 'phone');

-- =====================================================
-- PRODUCTS (15 productos)
-- =====================================================

-- Productos usados (10)
INSERT INTO products (id, title, description, price, condition, category, status, hours_of_use, physical_state, brand, model, seller_id) VALUES
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'RTX 3080 Ti Founders Edition', 'Tarjeta gráfica en excelente estado, usada para gaming casual. Sin minado, temperaturas normales.', 450.00, 'used', 'gpu', 'published', 800, 'Excelente estado, sin rayones', 'NVIDIA', 'RTX 3080 Ti FE', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'Ryzen 7 5800X', 'Procesador AMD en perfecto funcionamiento. Overclock moderado estable.', 180.00, 'used', 'cpu', 'published', 1200, 'Buen estado, thermal paste renovado', 'AMD', 'Ryzen 7 5800X', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'RAM Corsair Vengeance 32GB', 'Kit 2x16GB DDR4 3200MHz. Sin errores, estable.', 65.00, 'used', 'ram', 'published', 2000, 'Buen estado', 'Corsair', 'Vengeance LPX 32GB', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'SSD Samsung 970 EVO 1TB', 'NVMe en perfecto estado. Salud al 95%.', 55.00, 'used', 'storage', 'published', 3000, 'Excelente estado', 'Samsung', '970 EVO 1TB', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'RTX 2070 Super', 'GPU usada para gaming. Buen rendimiento en 1080p y 1440p.', 220.00, 'used', 'gpu', 'published', 1500, 'Leve desgaste, funcional', 'NVIDIA', 'RTX 2070 Super', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'iPhone 13 Pro 256GB', 'Celular en excelente estado. Batería al 92%. Funda siempre.', 580.00, 'used', 'phone', 'published', NULL, 'Excelente estado, sin rayones', 'Apple', 'iPhone 13 Pro', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07', 'Samsung Galaxy S22', 'Smartphone Android en buen estado. Pantalla perfecta.', 320.00, 'used', 'phone', 'published', NULL, 'Buen estado, leve desgaste', 'Samsung', 'Galaxy S22', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08', 'Monitor LG 27GN850', 'Monitor 27" 1440p 144Hz IPS. Sin pixels muertos.', 250.00, 'used', 'monitor', 'published', 4000, 'Buen estado, base estable', 'LG', '27GN850-B', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d09', 'Teclado Corsair K70', 'Teclado mecánico Cherry MX Red. Todas las teclas funcionan.', 45.00, 'used', 'keyboard', 'published', 3000, 'Desgaste en keycaps', 'Corsair', 'K70 RGB', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10', 'Mouse Logitech G Pro', 'Mouse gaming inalámbrico. Sensor perfecto.', 35.00, 'used', 'mouse', 'published', 1000, 'Excelente estado', 'Logitech', 'G Pro Wireless', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');

-- Productos nuevos (5)
INSERT INTO products (id, title, description, price, condition, category, status, brand, model, seller_id) VALUES
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'RTX 4070 Ti Super', 'Tarjeta gráfica nueva en caja sellada. Garantía oficial.', 850.00, 'new', 'gpu', 'published', 'NVIDIA', 'RTX 4070 Ti Super', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'Ryzen 9 7900X', 'Procesador nuevo en caja. Última generación AMD.', 380.00, 'new', 'cpu', 'published', 'AMD', 'Ryzen 9 7900X', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d13', 'RAM G.Skill Trident Z5 32GB', 'Kit DDR5 6000MHz nuevo. RGB.', 120.00, 'new', 'ram', 'published', 'G.Skill', 'Trident Z5 32GB', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d14', 'SSD WD Black SN850X 2TB', 'NVMe Gen4 nuevo. Máxima velocidad.', 150.00, 'new', 'storage', 'published', 'Western Digital', 'SN850X 2TB', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d15', 'iPhone 15 Pro Max', 'Último modelo Apple. Caja sellada.', 1200.00, 'new', 'phone', 'published', 'Apple', 'iPhone 15 Pro Max', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55');

-- =====================================================
-- VERIFICATIONS (para productos usados)
-- =====================================================

INSERT INTO verifications (id, result, notes, hours_of_use, physical_state, functional_test, cosmetic_grade, quality_score, product_id, verified_by) VALUES
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'pass', 'GPU en excelente estado. Benchmarks normales, sin artefactos. Temperaturas dentro de lo esperado.', 800, 'Excelente, sin rayones visibles', 'Todos los tests pasados: 3DMark, FurMark, juegos AAA', 'A', 4.80, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'pass', 'CPU funcionando correctamente. Overclock estable a 4.7GHz.', 1200, 'Buen estado, thermal paste renovado', 'Cinebench, Prime95, AIDA64 estables', 'B+', 4.50, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'pass', 'RAM sin errores. Frecuencia estable a 3200MHz.', 2000, 'Buen estado', 'MemTest86 24h sin errores', 'A-', 4.60, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'pass', 'SSD con excelente salud. Velocidades nominales.', 3000, 'Excelente estado', 'CrystalDiskMark, salud 95%', 'A', 4.70, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e05', 'conditional', 'GPU funcional pero con leve coil whine bajo carga. Rendimiento normal.', 1500, 'Leve desgaste en cooler', 'Benchmarks pasados con coil whine audible', 'B', 3.80, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06', 'pass', 'iPhone en excelente estado. Batería 92%, todos los sensores funcionales.', NULL, 'Excelente, sin rayones', 'Face ID, cámara, sensores OK', 'A', 4.90, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e07', 'pass', 'Samsung Galaxy en buen estado. Pantalla sin quemaduras.', NULL, 'Buen estado, leve desgaste', 'Todos los sensores y funciones OK', 'B+', 4.20, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e08', 'pass', 'Monitor sin pixels muertos. Colores y refresh rate correctos.', 4000, 'Buen estado, base estable', 'TestUFO, colores uniformes', 'A-', 4.50, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e09', 'pass', 'Teclado mecánico completo. Todas las teclas responden.', 3000, 'Desgaste normal en keycaps', 'Todas las teclas funcionales, RGB OK', 'B', 4.00, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('v0eebc99-9c0b-4ef8-bb6d-6bb9bd380e10', 'pass', 'Mouse inalámbrico perfecto. Sensor y batería OK.', 1000, 'Excelente estado', 'Sensor preciso, batería duradera', 'A', 4.70, 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- =====================================================
-- ORDERS (8 órdenes)
-- =====================================================

INSERT INTO orders (id, total, status, shipping_address, payment_method, custody_start_date, custody_end_date, buyer_id, product_id) VALUES
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 450.00, 'delivered', 'Av. Corrientes 1234, CABA', 'credit_card', '2024-01-15 10:00:00-03', '2024-01-18 10:00:00-03', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 180.00, 'delivered', 'Av. Santa Fe 5678, CABA', 'debit_card', '2024-01-20 14:00:00-03', '2024-01-23 14:00:00-03', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 65.00, 'delivered', 'Av. Cabildo 9012, CABA', 'credit_card', '2024-02-01 09:00:00-03', '2024-02-04 09:00:00-03', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f04', 580.00, 'in_custody', 'Av. Rivadavia 3456, CABA', 'credit_card', '2024-02-10 11:00:00-03', '2024-02-13 11:00:00-03', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f05', 850.00, 'paid', 'Av. Libertador 7890, CABA', 'credit_card', NULL, NULL, 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f06', 220.00, 'pending', 'Av. Las Heras 1111, CABA', 'bank_transfer', NULL, NULL, 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f07', 320.00, 'cancelled', 'Av. Córdoba 2222, CABA', 'credit_card', NULL, NULL, 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07'),
('o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f08', 250.00, 'delivered', 'Av. Callao 3333, CABA', 'debit_card', '2024-02-15 16:00:00-03', '2024-02-18 16:00:00-03', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08');

-- =====================================================
-- REVIEWS (6 reseñas)
-- =====================================================

INSERT INTO reviews (id, rating, type, status, comment, seller_rating, product_rating, is_verified_purchase, buyer_id, seller_id, product_id, order_id) VALUES
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g01', 5, 'positive', 'approved', 'Excelente GPU, tal como la descripción. Carlos es un vendedor confiable.', 5, 5, true, 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g02', 4, 'positive', 'approved', 'CPU funcionando perfecto. Un poco de demora en la entrega pero todo bien.', 4, 5, true, 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g03', 5, 'positive', 'approved', 'RAM en perfecto estado, sin errores. María muy atenta.', 5, 5, true, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g04', 3, 'neutral', 'approved', 'Monitor funciona bien pero la base tenía un rayón no mencionado.', 3, 4, true, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08', 'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f08'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g05', 2, 'complaint', 'pending', 'El producto no coincide con la descripción. Tiene más horas de uso de las declaradas.', 1, 2, true, 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f04'),
('r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g06', 5, 'positive', 'approved', 'Mouse impecable, como nuevo. Recomendado.', 5, 5, true, 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10', NULL);

-- =====================================================
-- ADDRESSES
-- =====================================================

INSERT INTO addresses (id, user_id, street, city, state, zip_code, country, is_default) VALUES
('addr0bc99-9c0b-4ef8-bb6d-6bb9bd380h01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Av. Corrientes 1234', 'CABA', 'Buenos Aires', 'C1043', 'Argentina', true),
('addr0bc99-9c0b-4ef8-bb6d-6bb9bd380h02', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Av. Santa Fe 5678', 'CABA', 'Buenos Aires', 'C1059', 'Argentina', true),
('addr0bc99-9c0b-4ef8-bb6d-6bb9bd380h03', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Av. Cabildo 9012', 'CABA', 'Buenos Aires', 'C1426', 'Argentina', true),
('addr0bc99-9c0b-4ef8-bb6d-6bb9bd380h04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Av. Libertador 1111', 'CABA', 'Buenos Aires', 'C1001', 'Argentina', true),
('addr0bc99-9c0b-4ef8-bb6d-6bb9bd380h05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Av. Rivadavia 2222', 'CABA', 'Buenos Aires', 'C1033', 'Argentina', true);

-- =====================================================
-- VERIFICATION CHECKLIST
-- =====================================================

INSERT INTO verification_checklist (id, category, item_name, description, is_required, sort_order) VALUES
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i01', 'gpu', 'Test de benchmarks', 'Ejecutar 3DMark y comparar con resultados de referencia', true, 1),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i02', 'gpu', 'Temperaturas', 'Verificar temperaturas bajo carga (máx 85°C)', true, 2),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i03', 'gpu', 'Artefactos visuales', 'Buscar artefactos en renderizado 3D', true, 3),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i04', 'gpu', 'Historial de minado', 'Verificar si fue usada para minería', true, 4),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i05', 'cpu', 'Stress test', 'Ejecutar Prime95 por 1 hora mínimo', true, 1),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i06', 'cpu', 'Temperaturas', 'Verificar temperaturas bajo carga', true, 2),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i07', 'cpu', 'Estabilidad', 'Verificar estabilidad en uso normal', true, 3),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i08', 'ram', 'MemTest86', 'Ejecutar MemTest86 por 24 horas', true, 1),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i09', 'ram', 'Frecuencia', 'Verificar frecuencia nominal', true, 2),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i10', 'storage', 'CrystalDiskInfo', 'Verificar salud del disco', true, 1),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i11', 'storage', 'Velocidades', 'Medir velocidades de lectura/escritura', true, 2),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i12', 'phone', 'Batería', 'Verificar salud de batería', true, 1),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i13', 'phone', 'Pantalla', 'Verificar pixels y burn-in', true, 2),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i14', 'phone', 'Sensores', 'Verificar todos los sensores', true, 3),
('chk0bc99-9c0b-4ef8-bb6d-6bb9bd380i15', 'phone', 'Cámaras', 'Verificar todas las cámaras', true, 4);

-- =====================================================
-- FAVORITES
-- =====================================================

INSERT INTO favorites (user_id, product_id) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d12'),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06'),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d15');

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

INSERT INTO notifications (user_id, title, message, type, is_read, data) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Orden entregada', 'Tu orden #o01 ha sido entregada exitosamente.', 'order', true, '{"orderId": "o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01"}'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Nuevo producto en favoritos', 'RTX 4070 Ti Super bajó de precio.', 'price_alert', false, '{"productId": "p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11"}'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Nueva venta', 'Has vendido un RTX 3080 Ti.', 'sale', true, '{"orderId": "o0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01"}'),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'Queja recibida', 'Tu queja sobre el iPhone 13 Pro está en revisión.', 'complaint', false, '{"reviewId": "r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g05"}'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Queja pendiente', 'Hay una nueva queja que requiere revisión.', 'admin', false, '{"reviewId": "r0eebc99-9c0b-4ef8-bb6d-6bb9bd380g05"}');

-- =====================================================
-- PRODUCT IMAGES
-- =====================================================

INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'https://ers-storage.com/images/gpu-3080ti-1.jpg', true, 1),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'https://ers-storage.com/images/gpu-3080ti-2.jpg', false, 2),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'https://ers-storage.com/images/gpu-3080ti-3.jpg', false, 3),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'https://ers-storage.com/images/cpu-5800x-1.jpg', true, 1),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'https://ers-storage.com/images/iphone13pro-1.jpg', true, 1),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'https://ers-storage.com/images/iphone13pro-2.jpg', false, 2),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'https://ers-storage.com/images/gpu-4070tis-1.jpg', true, 1),
('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d15', 'https://ers-storage.com/images/iphone15pm-1.jpg', true, 1);

-- =====================================================
-- MESSAGES (conversaciones entre usuarios)
-- =====================================================

INSERT INTO messages (sender_id, receiver_id, product_id, content, is_read) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'Hola, ¿la RTX 3080 Ti sigue disponible?', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'Sí, está disponible. ¿Tenés alguna pregunta?', true),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', '¿Cuánto tiempo la usaste? ¿Para gaming?', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'Aproximadamente 800 horas, solo gaming casual. Nunca para minería.', true),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', '¿El Ryzen 5800X tiene garantía?', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'La garantía de AMD ya venció, pero ERS ofrece 3 días de custodia.', true);
