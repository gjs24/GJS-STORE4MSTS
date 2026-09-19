-- Initial Seed Data for MSTS-GJS Production Store (Dev Environment)

-- 1. Insert Initial Users
-- Passwords are encrypted with BCrypt for 'admin123' and 'user123'
INSERT INTO users (id, username, email, password, role, is_active, created_at, updated_at)
VALUES 
(1, 'jebimercy', 'gjs242004@gmail.com', '$2a$10$wN1FvjG.0k2gA8G5L3zRtuO29mR4/LwqHk8uH1tM7mEvX8p1G.Z8i', 'ROLE_ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'sweetushar007', 'sweetushar007@gmail.com', '$2a$10$wN1FvjG.0k2gA8G5L3zRtuO29mR4/LwqHk8uH1tM7mEvX8p1G.Z8i', 'ROLE_USER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Insert User Profiles
INSERT INTO user_profiles (id, user_id, phone_number, created_at, updated_at)
VALUES 
(1, 1, '7845727002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, '9876543210', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Insert Categories
INSERT INTO categories (id, name, slug, description, icon, is_active)
VALUES 
(1, 'Electric Locomotives', 'electric-locomotives', 'High-powered WAP-7, WAP-5, and WAP-4 Indian Railways electric engines with custom sounds & 3D cabs.', 'Zap', true),
(2, 'Diesel Locomotives', 'diesel-locomotives', 'Classic ALCo & EMD workhorses: WDP-4D, WDG-4, WDM-3D with true-to-life locomotive physics.', 'Flame', true),
(3, 'Coaches & EMU', 'coaches-emu', 'High-speed LHB coaches, Vande Bharat Express trainsets, Tejas, and ICF heritage passenger stock.', 'Layers', true),
(4, 'Routes & Scenery', 'routes-scenery', 'Detailed Indian railway routes, realistic terrain textures, stations, signals, and railway scenery.', 'MapPin', true),
(5, 'Railway LED Boards', 'railway-led-boards', 'Dynamic LED dot-matrix destination boards, coach side nameboards, and direct DDS texture export.', 'Cpu', true);

-- 4. Insert Railway Board Templates (with Quick Presets!)
INSERT INTO board_templates (id, name, category, description, base_width, base_height, bg_image_url, target_texture_name, is_paid, price, published, quick_presets, created_at, updated_at)
VALUES 
('ir-coach-side-yellow', 'LHB Traditional Coach Side Board', 'LED_MATRIX', 'Standard Indian Railways yellow coach side board with trilingual text support and route endpoints.', 1024, 256, '/textures/board-yellow.png', 'LHB_BOARD.dds', false, 0.00, true, 
 '[{"id":"tamil-nadu-exp","name":"Tamil Nadu Exp","values":{"train_number":"12621 / 12622","train_name_en":"TAMIL NADU EXPRESS","train_name_hi":"तमिलनाडु एक्सप्रेस","route_endpoints":"चेन्नै सेंट्रल MGR CHENNAI CTL < > NEW DELHI नई दिल्ली"}},{"id":"karnataka-exp","name":"Karnataka Express","values":{"train_number":"12627 / 12628","train_name_en":"KARNATAKA EXPRESS","train_name_hi":"कर्नाटक एक्सप्रेस","route_endpoints":"केएसआर बेंगलूरु SBC < > NEW DELHI नई दिल्ली"}}]', 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('amrit-bharat-led-1024', 'Amrit Bharat Push-Pull LED Destination Board', 'LED_MATRIX', 'High-visibility orange LED dot-matrix destination board designed specifically for Amrit Bharat non-AC push-pull rakes.', 1024, 256, '/textures/board-amrit.png', 'AB_DESTINATION.dds', true, 15.00, true,
 '[{"id":"darbhanga-delhi","name":"Darbhanga - Delhi","values":{"train_number":"15557 / 15558","train_name_en":"AMRIT BHARAT EXPRESS","route_endpoints":"DBG < > ANVT"}},{"id":"howrah-balurghat","name":"Howrah - Balurghat","values":{"train_number":"13063 / 13064","train_name_en":"AMRIT BHARAT EXPRESS","route_endpoints":"HWH < > BLGT"}}]',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. Insert Sample Train Assets
INSERT INTO assets (id, title, slug, category_id, description, short_description, simulator_type, version, file_size, price, is_free, is_published, is_featured, created_at, updated_at)
VALUES 
(1, 'IR WAP-7 30201 Ghaziabad Shed (HOG Fitted)', 'ir-wap-7-ghaziabad-hog', 1, 'Ultra-detailed 3D model of Indian Railways 6350 HP WAP-7 passenger locomotive with custom cabview, accurate horn, and Head-On-Generation physics.', '6350 HP Passenger Electric Locomotive with realistic sound & 3D cab.', 'BOTH', '2.4.0', '142 MB', 0.00, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'GJS Vande Bharat Express Train Pack', 'vande-bharat-express-train-pack', 3, 'Complete 16-car rake of India''s premier semi-high speed trainset. Includes Executive Class, Chair Car, aerodynamic nose cone, and animated doors.', 'Complete 16-car semi-high speed trainset with custom physics & animated interiors.', 'BOTH', '1.2.0', '320 MB', 59.00, false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. Insert Site Settings
INSERT INTO site_settings (id, hero_image_alt, popup_enabled, popup_title, maintenance_mode, board_studio_enabled, updated_at)
VALUES 
(1, 'MSTS-GJS Production Store Indian Railways Simulations', false, 'Welcome to MSTS-GJS Production Store', false, true, CURRENT_TIMESTAMP);

