/* ==========================================================================
   灵魂成分表 · 数据与算法 v1.0
   --------------------------------------------------------------------------
   用法：
     <script src="soul-label-data.js"></script>
     const result = SOUL_LABEL.compute(answers)
     answers 形如 { K1: 4, K2: 3, ... R3: 5 }，1-5 分；缺失按 3 处理。
   ========================================================================== */
(function (root) {
  'use strict';

  var SOUL_LABEL = {
    meta: {
      version: '1.0',
      title: '灵魂成分表',
      subtitle: 'SOUL INGREDIENT LABEL',
      itemCount: 42,
      minutes: 6
    },

    scale: [
      { v: 1, label: '完全不像我' },
      { v: 2, label: '不太像' },
      { v: 3, label: '一半一半' },
      { v: 4, label: '比较像' },
      { v: 5, label: '就是我' }
    ],

    /* 四个分组的名字，答题时会显示在题干上方 */
    blocks: ['', '一个人的时候', '在人群里', '怎么扛事', '不想说但确实如此'],

    /* ---------------- 12 味配料 ---------------- */
    ingredients: [
      { id: 'mouth',  code: 'K', name: '嘴硬',     theory: '表达抑制（Gross, 1998）· 防御性自尊', high: '体面、扛事', low: '透明、易被看穿' },
      { id: 'replay', code: 'R', name: '事后复盘', theory: '反刍思维（Nolen-Hoeksema, 1991）',      high: '细腻、学习快', low: '翻篇快' },
      { id: 'mask',   code: 'P', name: '社交表演', theory: '自我监控（Snyder, 1974）',              high: '会来事、能救场', low: '始终一个版本' },
      { id: 'real',   code: 'Z', name: '真诚',     theory: '真实性（Kernis & Goldman）',             high: '可信、省事', low: '圆融、留余地' },
      { id: 'fawn',   code: 'T', name: '讨好',     theory: '讨好反应 fawn（Walker, 2013）',          high: '让人舒服', low: '先顾自己' },
      { id: 'border', code: 'B', name: '边界感',   theory: '自我分化（Bowen）· assertiveness',       high: '不易被消耗', low: '容易被人进来' },
      { id: 'numb',   code: 'D', name: '钝感力',   theory: '情绪稳定性（大五神经质低端）',             high: '抗压', low: '敏感、接收得多' },
      { id: 'ambition', code: 'Y', name: '野心',   theory: '成就动机（McClelland）· 促进焦点（Higgins）', high: '行动力强', low: '容易满足' },
      { id: 'slack',  code: 'L', name: '摆烂',     theory: '回避型应对（Carver 等, COPE）· 自我效能（Bandura）', high: '不被 PUA', low: '持续推进' },
      { id: 'curious', code: 'Q', name: '好奇心',  theory: '认知需求（Cacioppo）· 开放性',            high: '学得快', low: '专注、不分散' },
      { id: 'order',  code: 'O', name: '秩序感',   theory: '尽责性-条理 · 补偿性控制（Kay et al.）',   high: '靠谱', low: '随性、弹性大' },
      { id: 'soft',   code: 'X', name: '心软',     theory: '共情关怀（Davis, IRI）',                 high: '温暖', low: '就事论事' }
    ],

    /* ---------------- 36 道主体题 ---------------- */
    items: [
      { id: 'K1', ing: 'mouth',    block: 1, text: '一起吃饭，别人问我想吃什么，我明明有想吃的，最后还是说「都行，你们定」。' },
      { id: 'R1', ing: 'replay',   block: 1, text: '白天开会说错一句话，晚上躺在床上，我还会把那一段重新放一遍。' },
      { id: 'P1', ing: 'mask',     block: 1, text: '在同事、朋友、家人面前，我像三个不同的人，说话方式都不一样。' },
      { id: 'Z1', ing: 'real',     block: 1, text: '就算场面会冷下来，我也说不出那些明显违心的场面话。' },
      { id: 'T1', ing: 'fawn',     block: 1, text: '别人脸色一变，我第一反应是「是不是我做错了什么」，哪怕跟我没关系。' },
      { id: 'B1', ing: 'border',   block: 1, text: '有人让我帮一个我不想帮的忙，我可以直接说「这个我不太方便」。' },
      { id: 'D1', ing: 'numb',     block: 1, text: '被领导批评完，我一般当天就翻篇了，不会带到第二天。' },
      { id: 'Y1', ing: 'ambition', block: 1, text: '看到同龄人升职、换房、过得比我好，我心里那根弦会立刻绷紧。' },
      { id: 'L1', ing: 'slack',    block: 1, text: '明知道这件事今天必须做完，我还是会先躺一会儿、刷会儿手机。' },

      { id: 'Q1', ing: 'curious',  block: 2, text: '看到一个完全不认识的东西，我会想点进去看看它到底是什么。' },
      { id: 'O1', ing: 'order',    block: 2, text: '手机 App 的图标位置，我有固定排法，被人动过我会立刻发现。' },
      { id: 'X1', ing: 'soft',     block: 2, text: '看到别人为难、忙不过来，我会主动把事接过来，哪怕我自己也忙。' },
      { id: 'K2', ing: 'mouth',    block: 2, text: '事情已经压得我喘不过气了，别人问要不要帮忙，我还是说「我自己能搞定」。' },
      { id: 'R2', ing: 'replay',   block: 2, text: '跟人聊完天，我会回想自己哪句话说得不够好，甚至想重新说一遍。' },
      { id: 'P2', ing: 'mask',     block: 2, text: '走进一个房间之前，我会先判断这里该用什么状态、该说什么话。' },
      { id: 'Z2', ing: 'real',     block: 2, text: '别人问我意见，我一般给真的，哪怕这话不好听、会让他不高兴。' },
      { id: 'T2', ing: 'fawn',     block: 2, text: '要拒绝别人之前，我会先替他找好理由，甚至帮他想好退路。' },
      { id: 'B2', ing: 'border',   block: 2, text: '别人越过我的底线，我会当场说出来，而不是回家生闷气。' },

      { id: 'D2', ing: 'numb',     block: 3, text: '别人怎么评价我，很少影响我第二天的心情。' },
      { id: 'Y2', ing: 'ambition', block: 3, text: '让我一直停在原地、看不到进步，我接受不了。' },
      { id: 'L2', ing: 'slack',    block: 3, text: '计划被打乱之后，我经常干脆就不做了，等「下次再说」。' },
      { id: 'Q2', ing: 'curious',  block: 3, text: '拿到一样新东西，我喜欢把它拆开，搞清楚它到底怎么运作。' },
      { id: 'O2', ing: 'order',    block: 3, text: '出门前不把门锁、钥匙、燃气确认一遍，我心里就不踏实。' },
      { id: 'X2', ing: 'soft',     block: 3, text: '别人跟我讲难过的事，我会有生理反应——眼眶发热、胸口发闷。' },
      { id: 'K3', ing: 'mouth',    block: 3, text: '被人误会的时候，我通常懒得解释，除非对方是我很在乎的人。' },
      { id: 'R3', ing: 'replay',   block: 3, text: '五年前的一件尴尬事，我偶尔还会突然想起来，然后一个人难受一会儿。' },
      { id: 'P3', ing: 'mask',     block: 3, text: '我知道自己在社交场合「演」，而且演得还不错，很少有人看出来。' },

      { id: 'Z3', ing: 'real',     block: 4, text: '让我长期扮演一个不是我的样子，我会撑不住。' },
      { id: 'T3', ing: 'fawn',     block: 4, text: '群里没人说话、气氛冷下来时，我会忍不住出来接一句，哪怕我不太想说。' },
      { id: 'B3', ing: 'border',   block: 4, text: '我做的决定，不需要向所有人解释一遍才安心。' },
      { id: 'D3', ing: 'numb',     block: 4, text: '事情搞砸了，我先想「现在怎么补救」，而不是先自责半天。' },
      { id: 'Y3', ing: 'ambition', block: 4, text: '有人给我一个更大的位置，我会先答应下来，再想办法做好。' },
      { id: 'L3', ing: 'slack',    block: 4, text: '「算了，就这样吧」这句话，我今年说过很多次。' },
      { id: 'Q3', ing: 'curious',  block: 4, text: '比起「结论是什么」，我更想知道「为什么会这样」。' },
      { id: 'O3', ing: 'order',    block: 4, text: '看到桌面乱着，我会先收拾干净，才能开始干活。' },
      { id: 'X3', ing: 'soft',     block: 4, text: '就算对方有错，我也容易先想「他是不是也有难处」。' }
    ],

    /* ---------------- 6 道情境题 · 致敏原 ---------------- */
    triggers: [
      { id: 'ignored',  name: '被忽视' },
      { id: 'denied',   name: '被否定' },
      { id: 'compared', name: '被比较' },
      { id: 'arranged', name: '被安排' },
      { id: 'misread',  name: '被误解' },
      { id: 'left',     name: '被抛下' }
    ],

    scenarios: [
      { id: 'S1', scene: '开会时你提的方案被一句「这个之前试过，不太行」带过，没人再追问。', hint: '这一刻你最难受的是', options: [
        { k: 'A', text: '他们根本没在听我说', trigger: 'ignored' },
        { k: 'B', text: '是不是我的方案真的不行', trigger: 'denied' },
        { k: 'C', text: '同样的事，别人提就被采纳', trigger: 'compared' },
        { k: 'D', text: '反正最后都是领导定，我说了也不算', trigger: 'arranged' }
      ]},
      { id: 'S2', scene: '你发了一条很用心的消息，对方三个小时只回了一个「嗯」。', hint: '你脑子里先冒出哪一句', options: [
        { k: 'A', text: '我是不是哪句话说错了', trigger: 'denied' },
        { k: 'B', text: '他根本没认真看', trigger: 'ignored' },
        { k: 'C', text: '他是不是不想理我了', trigger: 'left' },
        { k: 'D', text: '他是不是误会我的意思了', trigger: 'misread' }
      ]},
      { id: 'S3', scene: '周末刷到朋友聚会的合照，里面没有你。', hint: '你心里最沉的那一下是', options: [
        { k: 'A', text: '他们跟别人玩得更好', trigger: 'compared' },
        { k: 'B', text: '我在他们心里没那么重要', trigger: 'ignored' },
        { k: 'C', text: '我被落下了', trigger: 'left' },
        { k: 'D', text: '是不是我哪里让他们误会了', trigger: 'misread' }
      ]},
      { id: 'S4', scene: '项目做完了，汇报是同事讲的，领导夸了他。', hint: '你最想不通的是', options: [
        { k: 'A', text: '他讲的版本根本不是我想的', trigger: 'misread' },
        { k: 'B', text: '他等于说我没贡献', trigger: 'denied' },
        { k: 'C', text: '领导一直更信他', trigger: 'compared' },
        { k: 'D', text: '我连开口的机会都没有', trigger: 'arranged' }
      ]},
      { id: 'S5', scene: '父母说「我们都给你安排好了，你照做就行」。', hint: '你最难接受的是', options: [
        { k: 'A', text: '我的人生被安排', trigger: 'arranged' },
        { k: 'B', text: '他们觉得我自己做不好', trigger: 'denied' },
        { k: 'C', text: '我说了，他们当没听见', trigger: 'misread' },
        { k: 'D', text: '他们从来没问过我想不想', trigger: 'left' }
      ]},
      { id: 'S6', scene: '过年饭桌上，亲戚问「现在一个月多少钱」。', hint: '你低头夹菜的时候在想', options: [
        { k: 'A', text: '没人真的关心我过得怎么样', trigger: 'ignored' },
        { k: 'B', text: '又被拿去和表姐比', trigger: 'compared' },
        { k: 'C', text: '我爸妈不帮我说话', trigger: 'left' },
        { k: 'D', text: '我的人生成了全家的议题', trigger: 'arranged' }
      ]}
    ],

    /* ---------------- 5 项营养成分 ----------------
       weights 为正表示正向贡献；负向构念内部按 (4 - raw) 计算 */
    composites: [
      { id: 'stable',   name: '情绪稳定度', weights: { numb: 1.0, replay: -0.7, mouth: -0.3 }, desc: '波动大不大' },
      { id: 'secure',   name: '关系安全感', weights: { border: 0.9, fawn: -0.9, real: 0.4, soft: -0.2 }, desc: '会不会怕失去' },
      { id: 'drive',    name: '行动力',     weights: { ambition: 0.9, order: 0.7, slack: -0.7, replay: -0.2 }, desc: '想的事会不会做' },
      { id: 'clarity',  name: '自我清晰度', weights: { real: 0.8, mask: -0.8, border: 0.6 }, desc: '知不知道自己是谁' },
      { id: 'recover',  name: '恢复速度',   weights: { numb: 0.9, replay: -0.7, curious: 0.4 }, desc: '多久能缓过来' }
    ],

    /* ---------------- 12 种结果 ---------------- */
    archetypes: {
      mouth: {
        name: '硬壳软糖', quote: '我不是不难过，我是觉得说出来更难堪。',
        feel: '看起来很好说话，其实什么都没说。',
        upside: '扛事、不给人添麻烦、关键时刻稳得住。',
        cost: '你的「没事」会被当真。情绪没有出口，就会从别的地方漏出来——失眠、突然烦躁、为一件小事哭。',
        relation: '要很久才交出钥匙，但交出去之后很忠诚。',
        supplement: '真诚。具体到一句话：「我今天不太好，但不用你解决。」',
        theory: 'Gross 的情绪调节模型里，表达抑制能减少别人看到的情绪，却不减少你体内的反应。压下去的情绪没有消失，它只是换了个人看见。',
        theoryTag: '表达抑制'
      },
      replay: {
        name: '深夜剪辑师', quote: '事情过去了，我的脑子还没收到通知。',
        feel: '白天正常上班，晚上重播白天。',
        upside: '共情准、学得快、能注意到别人漏掉的细节。',
        cost: '把「回想」当成「解决」。同一件事想第 30 遍，不会比第 3 遍更有答案。',
        relation: '会记得对方三年前随口说的一句话。',
        supplement: '钝感力。把复盘写成三行「下次怎么做」，给它一个出口。',
        theory: 'Nolen-Hoeksema 把反复思考分成两种：一种问「为什么又是我」，一种问「下一步怎么办」。前者和抑郁相关，后者才是反思。区别不在想多少，在想什么。',
        theoryTag: '反刍 vs 反思'
      },
      mask: {
        name: '人形适配器', quote: '我不是虚伪，我是太会读空气了。',
        feel: '见谁都能对上频，回家发现自己没频道。',
        upside: '场合感极好，能救场，谁都能聊两句。',
        cost: '演久了会分不清哪个是自己，独处时会有「我是谁」的空洞感。',
        relation: '你给每个人的都是定制版，没人见过完整版。',
        supplement: '边界感。留一个「不用演」的人，一周见一次。',
        theory: 'Snyder 发现，高自我监控者擅长根据情境调整表达，社交上占优，但也更容易被环境定义。你不是没有自我，是自我太多版本。',
        theoryTag: '自我监控'
      },
      real: {
        name: '直给型选手', quote: '我说真话，不是为了赢，是因为绕路太累。',
        feel: '说话不包糖衣，喜恶写在脸上。',
        upside: '可信、省沟通成本、关系干净。',
        cost: '在需要「场面话」的场合吃亏；你的直白有时会被读成不在乎。',
        relation: '你给的是原图，不修图。',
        supplement: '心软。加一句「我说话直，但不是针对你」。',
        theory: '真实性（authenticity）和幸福感正相关，但研究区分了「做自己」和「怎么说」。真话可以说得让人接得住，这两件事不冲突。',
        theoryTag: '真实性的两面'
      },
      fawn: {
        name: '人形缓冲垫', quote: '我不是没脾气，我是先把脾气咽下去了。',
        feel: '谁不高兴，你第一个察觉。',
        upside: '让人舒服，是危机里的稳定器。',
        cost: '你的好会被当成默认设置，咽下去的东西会变成怨气。',
        relation: '常常是先道歉的那个，即使不是你的错。',
        supplement: '边界感。试一次不解释的拒绝。',
        theory: '「讨好」（fawn）是创伤反应之一，和战斗、逃跑、僵住并列。它的目的不是善良，是让对方别再生气。看清这一点，拒绝会容易一点。',
        theoryTag: '讨好也是一种应激'
      },
      border: {
        name: '门口有保安', quote: '我不是难搞，我只是有门。',
        feel: '客气，但有距离。',
        upside: '不容易被消耗，决策快，关系稳定。',
        cost: '在讲人情的场合显得冷；有人会把你的边界当成拒绝。',
        relation: '你不查手机，也不许别人查。',
        supplement: '心软。拒绝时补一句「我拒绝的是这件事，不是你」。',
        theory: 'Bowen 的自我分化指：能在关系里保持「我」，同时不切断连接。分化高的人不是冷漠，是不用靠讨好来维持关系。',
        theoryTag: '自我分化'
      },
      numb: {
        name: '情绪防弹衣', quote: '我不是不在乎，我是不打算为这件事失眠。',
        feel: '出了事，大家先找你。',
        upside: '恢复快、抗压、不被小事拖住。',
        cost: '有时会错过别人微妙的求助；容易被说「你怎么这么淡定」。',
        relation: '你是那个兜底的人，但很少有人问你累不累。',
        supplement: '好奇心。允许自己在安全的人面前不坚强一次。',
        theory: '情绪稳定性是心理健康最强的预测因子之一。但「稳定」不等于「没有」，只是阈值高。阈值高的人，崩的时候往往没人发现。',
        theoryTag: '稳定的代价'
      },
      ambition: {
        name: '自燃型燃料', quote: '我不是卷，我是真的想赢一次。',
        feel: '目标感强，走路带风。',
        upside: '行动力强、抗挫、能带动身边的人。',
        cost: '很难真正休息，把「停下来」等同于「落后」。',
        relation: '会不小心把亲密关系也做成项目。',
        supplement: '钝感力。每周做一件「没有产出」的事。',
        theory: 'Higgins 的调节焦点理论：促进焦点的人追着收益跑，对「没有进步」格外敏感。问题不在野心，在于你把休息也算进了 KPI。',
        theoryTag: '促进焦点'
      },
      slack: {
        name: '低电量模式', quote: '我不是放弃，我是在等一个值得开机的原因。',
        feel: '什么都懂，就是不动。',
        upside: '不容易被 PUA，对无效努力免疫。',
        cost: '机会会绕着你走；长期低电量会变成真的没电。',
        relation: '在关系里也常「已读不回」。',
        supplement: '秩序感。找一个 10 分钟能做完的小任务。',
        theory: '回避型应对短期确实能降焦虑，长期会削弱自我效能感（Bandura）：越不做，越觉得自己做不到，越不想做。',
        theoryTag: '回避的循环'
      },
      curious: {
        name: '万物拆解员', quote: '我不是三分钟热度，我是三分钟就够看出门道。',
        feel: '什么都能聊，什么都试过一点。',
        upside: '学得快、话题多、不容易无聊。',
        cost: '深度不够；收藏夹里全是「以后再看」。',
        relation: '会对一个人产生兴趣，也会对「了解他」这件事失去兴趣。',
        supplement: '秩序感。把一件事做到第 21 天。',
        theory: '认知需求（need for cognition）高的人，从「想明白」本身获得快感。这让你学得快，也让你更容易被下一个新东西带走。',
        theoryTag: '认知需求'
      },
      order: {
        name: '人间收纳盒', quote: '我不是控制狂，我只是想让事情有个地方放。',
        feel: '靠谱，交付稳定。',
        upside: '让人安心，答应的事一定做到。',
        cost: '计划被打乱时比别人更崩；容易把「可控」当成「安全」。',
        relation: '会替对方安排好一切，然后怪他不领情。',
        supplement: '好奇心。过一次「故意不安排」的周末。',
        theory: '人在不确定里会抓住能控制的东西。秩序不是强迫症，是你给自己搭的脚手架。脚手架可以留，但别住在里面。',
        theoryTag: '补偿性控制'
      },
      soft: {
        name: '共情接收器', quote: '我不是不会拒绝，我是看见他为难就开不了口。',
        feel: '谁难过都找你，你是免费的树洞。',
        upside: '温暖、值得托付、关系里的黏合剂。',
        cost: '容易被人拿「可怜」当筹码；共情是会累的。',
        relation: '常常替对方找理由，最后没有人为你找。',
        supplement: '边界感。做一次「我先顾自己」的选择。',
        theory: '共情分两种：情绪共情（我感受到你的痛）和认知共情（我理解你的痛）。前者消耗大，会带来共情疲劳。帮人之前先分清：你是在感受，还是在理解。',
        theoryTag: '两种共情'
      },
      balanced: {
        name: '万能高汤', quote: '我不是没有性格，我是什么都能配一点。',
        feel: '跟你相处很省力，因为你身上很少有特别扎人的部分。',
        upside: '适应力极强，放在什么锅里都能出味。',
        cost: '不太有记忆点；别人说起你，常说「挺好的」，然后没了。',
        relation: '你很少和人起冲突，也很少让人真正着急。',
        supplement: '野心。挑一件事，允许自己偏科一次。',
        theory: '这是隐藏款：12 味配料的最高与次高差距小于 3 个百分点。它常常出现在「怎么答都觉得像」的人身上，也可能是你答得太客气了。人格测量里管这叫「趋中反应」，它本身就是一种信息。',
        theoryTag: '隐藏款 · 趋中反应'
      }
    },

    /* ---------------- 计分参数 ---------------- */
    scoring: { power: 3.0, base: 0.4, mystery: 3, targetSum: 97, clampMin: 8, clampMax: 96, flatSd: 0.45 }
  };

  /* ======================== 参考实现 ======================== */

  function meanByIngredient(answers) {
    var raw = {};
    SOUL_LABEL.ingredients.forEach(function (ing) {
      var list = SOUL_LABEL.items.filter(function (i) { return i.ing === ing.id; });
      var sum = 0;
      list.forEach(function (i) {
        var v = Number(answers[i.id]);
        sum += (v >= 1 && v <= 5) ? v : 3;
      });
      raw[ing.id] = sum / list.length - 1; // 0-4
    });
    return raw;
  }

  /* 最大余数法取整，保证总和等于 target */
  function largestRemainder(values, target) {
    var sum = values.reduce(function (a, b) { return a + b; }, 0);
    var scaled = values.map(function (v) { return v / sum * target; });
    var floors = scaled.map(Math.floor);
    var used = floors.reduce(function (a, b) { return a + b; }, 0);
    var rest = target - used;
    var order = scaled.map(function (v, i) { return { i: i, r: v - Math.floor(v) }; })
      .sort(function (a, b) { return b.r - a.r; });
    for (var k = 0; k < rest; k++) floors[order[k % order.length].i] += 1;
    return floors;
  }

  SOUL_LABEL.compute = function (answers) {
    answers = answers || {};
    var S = SOUL_LABEL.scoring;
    var raw = meanByIngredient(answers);

    var weights = SOUL_LABEL.ingredients.map(function (ing) {
      return Math.pow(raw[ing.id] + S.base, S.power);
    });
    var pcts = largestRemainder(weights, S.targetSum);

    var rows = SOUL_LABEL.ingredients.map(function (ing, i) {
      return { id: ing.id, name: ing.name, code: ing.code, raw: +raw[ing.id].toFixed(2), pct: pcts[i] };
    });

    var sorted = rows.slice().sort(function (a, b) { return b.pct - a.pct || b.raw - a.raw; });
    var vals = SOUL_LABEL.ingredients.map(function (g) { return raw[g.id]; });
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    var sd = Math.sqrt(vals.reduce(function (s, v) { return s + Math.pow(v - avg, 2); }, 0) / vals.length);
    var mainId = sd < S.flatSd ? 'balanced' : sorted[0].id;

    var composites = {};
    SOUL_LABEL.composites.forEach(function (c) {
      var num = 0, den = 0;
      Object.keys(c.weights).forEach(function (key) {
        var w = c.weights[key];
        num += w > 0 ? w * raw[key] : w * (4 - raw[key]);
        den += Math.abs(w);
      });
      var v = Math.round(num / den / 4 * 100);
      composites[c.id] = Math.max(S.clampMin, Math.min(S.clampMax, v));
    });

    var days = Math.max(1, Math.min(7, Math.round(1 + (composites.recover - S.clampMin) / (S.clampMax - S.clampMin) * 6)));
    var consumption = raw.mask * 0.5 + raw.fawn * 0.5 + raw.soft * 0.3 - raw.border * 0.4;
    var storage = consumption > 0.9
      ? '避免连续社交超过 48 小时'
      : (consumption > 0.5 ? '避免连续社交超过 72 小时' : '常温避光即可，长期独处不影响品质');

    return {
      raw: raw,
      rows: rows,
      sorted: sorted,
      mystery: S.mystery,
      main: mainId,
      archetype: SOUL_LABEL.archetypes[mainId],
      composites: composites,
      shelfLife: {
        days: days,
        text: days >= 6
          ? '开封后 ' + days + ' 天，建议尽快食用'
          : '开封后 ' + days + ' 天，冷藏可延长至 ' + Math.min(7, days + 3) + ' 天'
      },
      storage: storage
    };
  };

  /* 致敏原：选中次数 / 出现次数，取前 2（并列展示 3 个） */
  SOUL_LABEL.computeTriggers = function (picks) {
    var counts = {}, appear = {};
    SOUL_LABEL.triggers.forEach(function (t) { counts[t.id] = 0; appear[t.id] = 0; });
    SOUL_LABEL.scenarios.forEach(function (s) {
      s.options.forEach(function (o) { appear[o.trigger] += 1; });
    });
    Object.keys(picks).forEach(function (sid) {
      var s = SOUL_LABEL.scenarios.filter(function (x) { return x.id === sid; })[0];
      if (!s) return;
      var o = s.options.filter(function (x) { return x.k === picks[sid]; })[0];
      if (o) counts[o.trigger] += 1;
    });
    var list = SOUL_LABEL.triggers.map(function (t) {
      return { id: t.id, name: t.name, score: +(counts[t.id] / appear[t.id]).toFixed(2), count: counts[t.id] };
    }).filter(function (t) { return t.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    var n = 2;
    if (list[2] && list[1].score >= 0.5 && list[2].score === list[1].score) n = 3;
    return list.slice(0, n);
  };

  root.SOUL_LABEL = SOUL_LABEL;
})(typeof window !== 'undefined' ? window : globalThis);
