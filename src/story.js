const MEMORIES = [
  {
    id: 'snow',
    name: '雪夜初遇',
    cg: 'assets/cg/cg_memory_snow.png',
    desc: '大雪的那一夜，莉莉安在城堡外发现了重伤的卡蜜拉。她没有害怕，只是把灯举近了一点。',
  },
  {
    id: 'tea',
    name: '炉边茶会',
    cg: 'assets/cg/cg_memory_tea.png',
    desc: '壁炉烧得很暖。莉莉安笑着倒茶，卡蜜拉第一次觉得，人类的城堡也可以不是牢笼。',
  },
  {
    id: 'dance',
    name: '月下共舞',
    cg: 'assets/cg/cg_memory_dance.png',
    desc: '旧音乐盒转动起来。血月升到窗外时，她们在空荡的舞厅里跳完了一支没有观众的舞。',
  },
];

const KEEPSAKES = [
  {
    id: 'ribbon',
    name: '莉莉安的丝带',
    cg: 'assets/cg/cg_keepsake_ribbon.png',
    desc: '莉莉安把红色丝带系在卡蜜拉腕上，说这样她就不会在雪夜里走丢。',
  },
  {
    id: 'musicbox',
    name: '旧音乐盒',
    cg: 'assets/cg/cg_keepsake_musicbox.png',
    desc: '音乐盒的曲子很短，短到只够两个人靠在一起，听完一整个冬天。',
  },
];

const HIDDEN_ITEM = {
  id: 'hairpin',
  name: '雪夜发饰',
  cg: 'assets/cg/cg_hidden_hairpin.png',
  desc: '银蓝色的发饰，是雪夜约定留下的最后一件信物。',
};

const ENDINGS = {
  bad: { name: '深渊结局', subtitle: '血月之下，没有人记得那个雪夜。' },
  normal: { name: '遗忘结局', subtitle: '她活着，只是不再记得我。' },
  happy: { name: '重逢结局', subtitle: '这一次，换我记住你。' },
  true: { name: '血月之约', subtitle: '血月之约，不是诅咒，是约定。' },
};

const STORY = {
  opening: [
    { speaker: '旁白', text: '血月升起的那一夜，深渊领主掳走了莉莉安。' },
    { speaker: '深渊领主', portrait: 'abyss', text: '圣血归位之时，深渊会重新睁开眼。' },
    { speaker: '旁白', text: '他要用公主的圣血，打开深渊之门。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '人类欠我的，我不在乎。但她……不一样。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '等我，莉莉安。' },
  ],
  bossPre: [
    { speaker: '深渊领主', portrait: 'abyss', text: '一个吸血鬼，来救人类？你的血可没有她的圣洁。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '我不需要圣洁。我只需要她活着。' },
    { speaker: '深渊领主', portrait: 'abyss', text: '那就让我看看，你能为她流多少血。' },
  ],
  bossTransform: [
    { speaker: '深渊领主', portrait: 'abyss', text: '你逼我露出真身了，吸血鬼。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '正合我意。省得我拆了这座城堡。' },
  ],
  bossDeath: [
    { speaker: '旁白', text: '深渊领主的身体化作黑雾。王座厅里只剩下血月的光。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '莉莉安……我来了。' },
    { speaker: '莉莉安', portrait: 'lillian', text: '卡蜜拉……你的手，好冷。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '别怕。这一次，我不会再放开。' },
  ],
  bossFall: [
    { speaker: '旁白', text: '她倒在碎裂的祭坛边，指尖还残留着一点微弱的圣光。' },
    { speaker: '卡蜜拉', portrait: 'camilla', text: '只要你还活着……我们就还有选择。' },
  ],
  endings: {
    bad: [
      { speaker: '旁白', text: '深渊之门完全敞开。莉莉安的圣血被抽干，最后一点光从她眼中熄灭。' },
      { speaker: '深渊领主', portrait: 'abyss', text: '太迟了，吸血鬼。她连你的名字都不记得。' },
      { speaker: '卡蜜拉', portrait: 'camilla', text: '……莉莉安。' },
      { speaker: '旁白', text: '血月之下，没有人记得那个雪夜。' },
    ],
    normal: [
      { speaker: '旁白', text: '你击碎了仪式，把莉莉安带出了城堡。' },
      { speaker: '莉莉安', portrait: 'lillian', text: '谢谢你救了我……请问，我们以前见过吗？' },
      { speaker: '卡蜜拉', portrait: 'camilla', text: '……没有。你只是做了一个很长很长的梦。' },
      { speaker: '旁白', text: '她活着，只是不再记得我。' },
    ],
    happy: [
      { speaker: '旁白', text: '记忆碎片回到莉莉安的身体里。她睁开眼，先看见了你。' },
      { speaker: '莉莉安', portrait: 'lillian', text: '卡蜜拉……那天雪夜，你来过，对不对？' },
      { speaker: '卡蜜拉', portrait: 'camilla', text: '你一直记得？' },
      { speaker: '莉莉安', portrait: 'lillian', text: '我一直记得。这一次，换我记住你。' },
      { speaker: '旁白', text: '血月仍在，但她们终于找回了彼此。' },
    ],
    true: [
      { speaker: '旁白', text: '卡蜜拉把自己的诅咒之血放进圣血祭坛。深渊之门发出最后的哀鸣。' },
      { speaker: '莉莉安', portrait: 'lillian', text: '你会失去什么？' },
      { speaker: '卡蜜拉', portrait: 'camilla', text: '一点不死，一点自由。换来一个记得我的你，很划算。' },
      { speaker: '旁白', text: '血月碎裂。她们在晨光里牵着手，离开了城堡。' },
      { speaker: '旁白', text: '血月之约，不是诅咒，是约定。' },
    ],
  },
};

function endingFor(restored, keepsakes, hidden, choice) {
  if (choice === 'abyss') return 'bad';
  if (restored <= 1) return 'bad';
  if (choice === 'pact') return restored >= 3 && keepsakes >= 2 && hidden >= 1 ? 'true' : 'normal';
  if (choice === 'leave') return 'normal';
  if (choice === 'stay') return restored >= 3 ? 'happy' : 'normal';
  return 'normal';
}

function endingChoices(restored, keepsakes, hidden) {
  if (restored <= 1) return [];
  const opts = [
    { id: 'stay', label: '握住她的手', sub: '这一次，不再放开。', ending: restored >= 3 ? 'happy' : 'normal' },
    { id: 'leave', label: '转身离开', sub: '她活着就够了。', ending: 'normal' },
  ];
  if (restored >= 3 && keepsakes >= 2 && hidden >= 1) {
    opts.push({ id: 'pact', label: '交换血约', sub: '用我的血，换她的记忆。', ending: 'true' });
  }
  opts.push({ id: 'abyss', label: '接受深渊', sub: '让血月完成它的约定。', ending: 'bad' });
  return opts;
}
