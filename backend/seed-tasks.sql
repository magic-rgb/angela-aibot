INSERT INTO tasks (slug, category, title, url, reward_points) VALUES
('telegram-community','primary','Join ANGELA Community','https://t.me/angelaCommunity',1000),
('x-angela','primary','Follow ANGELA on X','https://x.com/Angelaxai',1000),
('discord-community','primary','Join ANGELA Discord','https://discord.gg/CSqtGeq6r',1000),
('youtube-angela','primary','Subscribe to ANGELA','https://youtube.com/@angelaxai',1000),
('uiux-alexa','secondary','Follow Alexa Rodriguez — UI/UX','https://x.com/Alexauiux',500),
('ceo-ameli','secondary','Follow CEO — Ameli','https://x.com/ameliui',500),
('cto-elena','secondary','Follow CTO — Elena','https://x.com/Elenacto',500)
ON CONFLICT (slug) DO NOTHING;
