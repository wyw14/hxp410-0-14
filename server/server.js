const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3005;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

const DEFAULT_ROOMS = [
  { id: 'family', name: '亲情房间', icon: '👨‍👩‍👧', description: '关于家人的秘密与忏悔', color: '#FF6B6B' },
  { id: 'friendship', name: '友情房间', icon: '🤝', description: '关于朋友的秘密与忏悔', color: '#4ECDC4' },
  { id: 'work', name: '工作房间', icon: '💼', description: '关于职场的秘密与忏悔', color: '#45B7D1' },
  { id: 'love', name: '爱情房间', icon: '💕', description: '关于爱人的秘密与忏悔', color: '#F38181' },
  { id: 'school', name: '校园房间', icon: '🎓', description: '关于校园的秘密与忏悔', color: '#AA96DA' },
  { id: 'other', name: '其他房间', icon: '🌈', description: '其他难以归类的秘密', color: '#FCBAD3' }
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ROOMS_FILE)) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(DEFAULT_ROOMS, null, 2));
}

if (!fs.existsSync(SECRETS_FILE)) {
  const initialSecrets = [
    { id: '1', content: '我曾经偷偷把同桌的铅笔藏起来，看到他着急的样子我很后悔，现在想对他说声对不起。', status: '已宽恕', roomId: 'school', createdAt: '2024-01-15T10:30:00.000Z' },
    { id: '2', content: '小时候打碎了家里的花瓶，却说是猫咪干的。这件事一直压在我心里很多年。', status: '已宽恕', roomId: 'family', createdAt: '2024-01-16T14:20:00.000Z' },
    { id: '3', content: '我因为嫉妒朋友的成绩，故意在考试前把她的复习笔记藏了起来。现在想想真的很幼稚。', status: '已宽恕', roomId: 'friendship', createdAt: '2024-01-17T09:15:00.000Z' },
    { id: '4', content: '工作后为了表现自己，抢了同事的功劳。虽然升职了，但每次看到她都很愧疚。', status: '已宽恕', roomId: 'work', createdAt: '2024-01-18T16:45:00.000Z' },
    { id: '5', content: '我对父母说了很多伤人的话，明明知道他们是为我好，却总是控制不住自己的脾气。', status: '已宽恕', roomId: 'family', createdAt: '2024-01-19T11:00:00.000Z' }
  ];
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(initialSecrets, null, 2));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  const secrets = JSON.parse(data);
  return secrets.map(s => ({ ...s, roomId: s.roomId || 'other' }));
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readRooms() {
  const data = fs.readFileSync(ROOMS_FILE, 'utf8');
  return JSON.parse(data);
}

function getRoomStats(secrets, roomId) {
  const roomSecrets = roomId === 'all'
    ? secrets.filter(s => s.status === '已宽恕')
    : secrets.filter(s => s.roomId === roomId && s.status === '已宽恕');
  return {
    total: roomSecrets.length,
    lastWeek: roomSecrets.filter(s => {
      const date = new Date(s.createdAt);
      const now = new Date();
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length
  };
}

app.get('/api/rooms', (req, res) => {
  try {
    const rooms = readRooms();
    const secrets = readSecrets();
    const roomsWithStats = rooms.map(room => ({
      ...room,
      stats: getRoomStats(secrets, room.id)
    }));
    res.json(roomsWithStats);
  } catch (error) {
    console.error('获取房间列表出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const rooms = readRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    const secrets = readSecrets();
    res.json({
      ...room,
      stats: getRoomStats(secrets, roomId)
    });
  } catch (error) {
    console.error('获取房间信息出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/rooms/:roomId/secrets', (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    const rooms = readRooms();
    const roomExists = rooms.some(r => r.id === roomId);
    if (!roomExists) {
      return res.status(404).json({ error: '房间不存在' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      roomId: roomId,
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/rooms/:roomId/secrets', (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const rooms = readRooms();
    const roomExists = rooms.some(r => r.id === roomId);
    if (!roomExists) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const secrets = readSecrets();
    const roomSecrets = secrets
      .filter(s => s.roomId === roomId && s.status === '已宽恕')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      secrets: roomSecrets,
      total: secrets.filter(s => s.roomId === roomId && s.status === '已宽恕').length
    });
  } catch (error) {
    console.error('获取房间秘密列表出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/rooms/:roomId/secrets/random', (req, res) => {
  try {
    const { roomId } = req.params;

    const rooms = readRooms();
    const roomExists = rooms.some(r => r.id === roomId);
    if (!roomExists) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.roomId === roomId && s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '这个房间还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status,
        roomId: randomSecret.roomId
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const secrets = readSecrets();
    const allSecrets = secrets
      .filter(s => s.status === '已宽恕')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      secrets: allSecrets,
      total: secrets.filter(s => s.status === '已宽恕').length
    });
  } catch (error) {
    console.error('获取全部秘密列表出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/secrets', (req, res) => {
  try {
    const { content, roomId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const finalRoomId = roomId || 'other';
    const rooms = readRooms();
    const roomExists = rooms.some(r => r.id === finalRoomId);
    if (!roomExists) {
      return res.status(400).json({ error: '房间不存在' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      roomId: finalRoomId,
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status,
        roomId: randomSecret.roomId
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
