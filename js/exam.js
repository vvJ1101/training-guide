(function(){
  'use strict';

  const EXAM_STATUS = Object.freeze({ PENDING:'pending', SUBMITTED:'submitted', REVIEWED:'reviewed' });
  const MAX_IMAGES_PER_NODE = 5;
  const MAX_IMAGE_WIDTH = 1920;
  const IMAGE_QUALITY = 0.8;

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
    return 'h' + Math.abs(h).toString(36);
  }
  const ADMIN_PASSWORD_HASH = hashStr('admin123');

  const LIANXIN_NODES = [
    { id:'lx_order_filter', name:'联欣订单筛选与标签设置', guide:'上传联欣订单列表界面截图，需显示筛选条件、订单主题类型标签，确保未混淆云仓/期货/现货' },
    { id:'lx_product_audit', name:'联欣商品审核', guide:'上传订单详情/商品审核界面截图，确认商品清单、折扣、收货人信息、订单比例' }
  ];

  const KANGLEI_NODES = {
    cloud: [
      { id:'checkOrder', name:'检查渠道订单', guide:'渠道订单检查界面，需清晰显示订单号、客户名称、商品信息' },
      { id:'payment', name:'回款登记', guide:'回款单填写界面，需包含付款方式、收款金额、上传的付款凭证' },
      { id:'ship', name:'提交出货指令单', guide:'显示已提交的指令单即可' }
    ],
    spot: [
      { id:'spotPayment', name:'回款登记', guide:'现货回款单编辑界面，需包含付款方式、收款金额、付款凭证' }
    ],
    future: [
      { id:'deposit', name:'期货订金处理', guide:'订金收入单编辑界面，需显示订单号、付款方式' },
      { id:'finalPayment', name:'尾款处理（转回款）', guide:'转回款操作界面，需包含付款方式、收款金额、凭证上传' },
      { id:'balance', name:'使用余额支付', guide:'余额转入界面，需显示余额账号、支付额度、余额使用截图' }
    ]
  };

  const EXTRA_NODES = [
    { id:'recharge', name:'余额充值', guide:'余额充值操作界面，需显示品牌余额账号、充值金额、凭证' },
    { id:'express', name:'快递单据', guide:'上传快递单或物流信息截图' },
    { id:'taxDoc', name:'税费凭证', guide:'上传税单或税费相关截图' }
  ];

  const LOGISTICS_OPTIONS = ['寄付', '到付'];
  const TAX_OPTIONS = ['含税', '不含税'];
  const TYPE_LABELS = { cloud:'云仓', spot:'现货', future:'期货' };

  // ========== IndexedDB ==========
  const DB_NAME = 'ExamDB_v2';
  const DB_STORE = 'screenshots';
  const DB_KEY_SEP = '|';
  let _dbPromise = null;

  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        if (!e.target.result.objectStoreNames.contains(DB_STORE)) {
          e.target.result.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
    return _dbPromise;
  }

  function dbKey(examId, nodeId) { return examId + DB_KEY_SEP + nodeId; }

  async function imgGetAll(examId) {
    const db = await openDB();
    const prefix = examId + DB_KEY_SEP;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const range = IDBKeyRange.bound(prefix, prefix + '￿');
      const cursorReq = store.openCursor(range);
      const result = {};
      cursorReq.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) { result[cursor.key.slice(prefix.length)] = cursor.value; cursor.continue(); }
        else resolve(result);
      };
      cursorReq.onerror = () => resolve({});
    });
  }

  async function imgSet(examId, nodeId, urls) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(urls, dbKey(examId, nodeId));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function imgDeleteAll(examId) {
    const db = await openDB();
    const prefix = examId + DB_KEY_SEP;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const range = IDBKeyRange.bound(prefix, prefix + '￿');
      const cursorReq = store.openCursor(range);
      cursorReq.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
        else resolve();
      };
      cursorReq.onerror = () => resolve();
    });
  }

  const _ssCache = new Map();

  async function loadScreenshots(examId) {
    if (!_ssCache.has(examId)) { _ssCache.set(examId, await imgGetAll(examId)); }
    return _ssCache.get(examId);
  }

  async function saveNodeImgs(examId, nodeId, urls) {
    const all = _ssCache.get(examId) || {};
    all[nodeId] = urls;
    _ssCache.set(examId, all);
    await imgSet(examId, nodeId, urls);
  }

  async function migrateOldData() {
    const exams = getExamsRaw();
    let changed = false;
    for (const exam of exams) {
      if (exam.screenshots && Object.keys(exam.screenshots).length > 0) {
        for (const [nodeId, urls] of Object.entries(exam.screenshots)) {
          if (urls && urls.length > 0) await imgSet(exam.taskId, nodeId, urls);
        }
        delete exam.screenshots;
        changed = true;
      }
    }
    if (changed) setStore('exams', exams);
  }

  // ========== localStorage ==========
  function getStore(key, def) { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; } catch(e) { return def; } }
  function setStore(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function getExamsRaw() { return getStore('exams', []); }
  function getExams() { return getStore('exams', []).map(e => ({ ...e, screenshots: null })); }
  function saveExams(exams) { setStore('exams', exams); }
  function getTemplates() { return getStore('templates', []); }
  function saveTemplates(tpls) { setStore('templates', tpls); }
  function generateId() { return 'EX-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase(); }

  let currentUser = null;
  const app = document.getElementById('app');
  const toastContainer = document.getElementById('toast-container');

  function toast(msg, d = 2500) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, d);
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      if (btn._origHtml === undefined) btn._origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>' + (btn.dataset.loadingText || '处理中...');
    } else {
      btn.disabled = false;
      if (btn._origHtml !== undefined) btn.innerHTML = btn._origHtml;
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (file.size < 500 * 1024) {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsDataURL(file);
        return;
      }
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let { width, height } = img;
        const canvas = document.createElement('canvas');
        if (width > MAX_IMAGE_WIDTH) { height = Math.round(height * MAX_IMAGE_WIDTH / width); width = MAX_IMAGE_WIDTH; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function showLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.onclick = () => lb.remove();
    const img = document.createElement('img');
    img.src = url;
    lb.appendChild(img);
    document.body.appendChild(lb);
  }
  window.showLightbox = showLightbox;

  function getFullNodes(exam) {
    const base = KANGLEI_NODES[exam.type] || [];
    const extra = (exam.extraNodes || []).map(id => EXTRA_NODES.find(e => e.id === id)).filter(Boolean);
    const custom = (exam.customNodes || []).map(c => ({ id: c.id, name: c.name, guide: c.guide }));
    return [...LIANXIN_NODES, ...base, ...extra, ...custom];
  }

  function makeTemplateName(type, logistics, tax) {
    const parts = [TYPE_LABELS[type]];
    if (logistics) parts.push(logistics);
    if (tax) parts.push(tax);
    return parts.join('-');
  }

  function generateTemplateLibrary() {
    const types = ['cloud', 'spot', 'future'];
    const all = getTemplates();
    let added = 0;
    for (const type of types) {
      for (const logistics of LOGISTICS_OPTIONS) {
        for (const tax of TAX_OPTIONS) {
          const name = makeTemplateName(type, logistics, tax);
          if (!all.find(t => t.name === name)) {
            all.push({ name, type, logistics, tax, extraNodes: [], customNodes: [] });
            added++;
          }
        }
      }
    }
    saveTemplates(all);
    return added;
  }

  // ========== 登录 ==========
  function saveLogin() {
    if (currentUser) localStorage.setItem('loginData', JSON.stringify(currentUser));
    else localStorage.removeItem('loginData');
  }
  function restoreLogin() {
    try {
      const saved = localStorage.getItem('loginData');
      if (saved) { currentUser = JSON.parse(saved); return true; }
    } catch(e) {}
    return false;
  }

  function renderLogin() {
    currentUser = null;
    localStorage.removeItem('loginData');
    const sharedPwd = getStore('sharedExamPassword', '');
    app.innerHTML = `
      <h1>市场部系统操作考核 v3.0</h1>
      <div style="max-width:400px;margin:2rem auto;">
        <div class="form-group"><label>角色</label><select id="roleSelect"><option value="examiner">考核官</option><option value="candidate" selected>答题者</option></select></div>
        <div class="form-group"><label>用户名（工号或姓名）</label><input type="text" id="usernameInput" placeholder="工号或姓名"></div>
        <div class="form-group">
          <label id="pwdLabel">考核密码</label>
          <div style="display:flex;gap:0.4rem;">
            <input type="password" id="passwordInput" style="flex:1;">
            <button id="pwdToggleBtn" type="button" style="padding:0.6rem 0.8rem;flex-shrink:0;font-size:0.9rem;" tabindex="-1">👁</button>
          ${!sharedPwd ? '<span style="color:#94a3b8;font-size:0.8rem;">管理员未设考核密码时可任意登录</span>' : ''}
          </div>
        </div>
        <button id="loginBtn" class="success" style="width:100%;">登录</button>
        <button id="resetDataBtn" class="secondary danger" style="width:100%;margin-top:0.5rem;">重置所有数据</button>
        <a href="index.html" style="display:block;text-align:center;color:#2d6ee0;font-weight:600;margin-top:0.8rem;">📖 查看培训文档</a>
      </div>
    `;

    document.getElementById('roleSelect').addEventListener('change', function(){
      const isExaminer = this.value === 'examiner';
      document.getElementById('pwdLabel').textContent = isExaminer ? '管理员密码' : '考核密码';
    });

    document.getElementById('pwdToggleBtn').addEventListener('click', function(){
      const input = document.getElementById('passwordInput');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁' : '🙈';
    });

    function onEnter(e) { if (e.key === 'Enter') document.getElementById('loginBtn').click(); }
    document.getElementById('usernameInput').addEventListener('keydown', onEnter);
    document.getElementById('passwordInput').addEventListener('keydown', onEnter);

    document.getElementById('loginBtn').addEventListener('click', async function(){
      const role = document.getElementById('roleSelect').value;
      const username = document.getElementById('usernameInput').value.trim();
      const pwd = document.getElementById('passwordInput').value;
      if (!role || !username) return toast('请填写完整');
      setLoading(this, true);
      if (role === 'examiner') {
        if (hashStr(pwd) !== ADMIN_PASSWORD_HASH) { setLoading(this, false); return toast('密码错误'); }
        currentUser = { role, username };
        saveLogin();
        renderExaminerDashboard();
      } else {
        const sp = getStore('sharedExamPassword', '');
        if (sp && pwd !== sp) { setLoading(this, false); return toast('考核密码错误'); }
        currentUser = { role, username };
        saveLogin();
        renderCandidateDashboard();
      }
      if (document.body.contains(this)) setLoading(this, false);
    });

    document.getElementById('resetDataBtn').addEventListener('click', ()=>{
      if (confirm('确定清除所有数据吗？此操作不可恢复！')) {
        localStorage.clear();
        sessionStorage.clear();
        indexedDB.deleteDatabase(DB_NAME);
        _ssCache.clear();
        toast('数据已重置');
      }
    });

    document.getElementById('usernameInput').focus();
  }

  // ========== 答题者看板 ==========
  function renderCandidateDashboard() {
    const exams = getExamsRaw().filter(e => e.candidateName === currentUser.username);

    function renderList() {
      const container = document.getElementById('candidateExamList');
      if (!container) return;
      if (exams.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:2rem;">暂无分配给您的考核任务</p>';
        return;
      }
      container.innerHTML = exams.map(e => {
        const typeLabel = TYPE_LABELS[e.type] || e.type;
        const logistics = e.logistics || e.payment || '';
        const statusIcon = e.status===EXAM_STATUS.PENDING ? '⏳' : e.status===EXAM_STATUS.SUBMITTED ? '📤' : '✅';
        const statusLabel = e.status===EXAM_STATUS.PENDING ? '待提交' : e.status===EXAM_STATUS.SUBMITTED ? '已提交待审' : '已审核';
        const totalNodes = getFullNodes(e).length;
        const failedNodes = e.reviewResults ? Object.entries(e.reviewResults).filter(([,v])=>v==='fail').length : 0;
        const passedNodes = e.reviewResults ? Object.entries(e.reviewResults).filter(([,v])=>v==='pass').length : 0;
        const reviewInfo = e.status===EXAM_STATUS.REVIEWED ? `（通过${passedNodes}，不通过${failedNodes}）` : '';
        const canResubmit = e.status===EXAM_STATUS.REVIEWED && failedNodes > 0;

        let actionBtn = '';
        if (e.status === EXAM_STATUS.PENDING) {
          actionBtn = `<button class="startExamBtn success" data-id="${e.taskId}">开始考核</button>`;
        } else if (e.status === EXAM_STATUS.SUBMITTED) {
          actionBtn = `<span style="color:#64748b;">等待审核中...</span>`;
        } else if (canResubmit) {
          actionBtn = `<button class="resubmitBtn" data-id="${e.taskId}" style="background:#e65100;color:#fff;">重新提交（${failedNodes}个节点不通过）</button>
                       <button class="viewReportBtn secondary" data-id="${e.taskId}">查看结果</button>`;
        } else if (e.status === EXAM_STATUS.REVIEWED) {
          actionBtn = `<button class="viewReportBtn secondary" data-id="${e.taskId}">查看成绩单</button>`;
        }

        return `<div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <strong>${e.taskId}</strong> | ${typeLabel} | 物流：${logistics||'无'} | 税费：${e.tax||'无'}
            <br><span style="color:#64748b;">${statusIcon} ${statusLabel}${reviewInfo} | 共${totalNodes}个节点 | ${new Date(e.createTime).toLocaleDateString()}</span>
          </div>
          <div>${actionBtn}</div>
        </div>`;
      }).join('');

      container.querySelectorAll('.startExamBtn').forEach(b => b.addEventListener('click', function(){
        currentUser.taskId = this.dataset.id;
        saveLogin();
        renderCandidateUpload();
      }));
      container.querySelectorAll('.viewReportBtn').forEach(b => b.addEventListener('click', function(){
        currentUser.taskId = this.dataset.id;
        saveLogin();
        showCandidateReport(this.dataset.id);
      }));
      container.querySelectorAll('.resubmitBtn').forEach(b => b.addEventListener('click', function(){
        currentUser.taskId = this.dataset.id;
        saveLogin();
        renderCandidateUpload(true);
      }));
    }

    app.innerHTML = `
      <h1>我的考核任务</h1>
      <p>答题者：${currentUser.username}</p>
      <div id="candidateExamList"></div>
      <button id="cLogoutBtn" class="secondary">退出</button>
    `;
    renderList();
    document.getElementById('cLogoutBtn').addEventListener('click', ()=>{ currentUser=null; renderLogin(); });
  }

  // ========== 答题者查看成绩单 ==========
  async function showCandidateReport(taskId) {
    const exams = getExamsRaw();
    const exam = exams.find(e => e.taskId === taskId);
    if (!exam) return;
    const ss = await loadScreenshots(taskId);
    const nodes = getFullNodes(exam);
    const passed = nodes.filter(n => exam.reviewResults?.[n.id] === 'pass').length;
    const failed = nodes.filter(n => exam.reviewResults?.[n.id] === 'fail').length;

    function closeReport() { overlay.remove(); renderCandidateDashboard(); }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeReport(); });
    overlay.innerHTML = `
      <div class="modal-content">
        <button class="modal-close no-print" id="crClose">✕ 关闭</button>
        <h1>考核成绩单</h1>
        <p><strong>答题者：</strong>${exam.candidateName} | <strong>任务ID：</strong>${exam.taskId}</p>
        <p><strong>结果：</strong>通过 ${passed}/${nodes.length} | 不通过 ${failed}/${nodes.length}</p>
        <table>
          <tr><th>序号</th><th>节点</th><th>截图</th><th>结果</th><th>评语</th></tr>
          ${nodes.map((n,i) => {
            const r = exam.reviewResults?.[n.id];
            const urls = ss[n.id] || [];
            return `<tr>
              <td>${i+1}</td><td>${n.name}</td>
              <td>${urls.length ? urls.map(u => `<img src="${u}" style="max-width:80px;cursor:pointer;" onclick="showLightbox('${u.replace(/'/g,"\\'")}')">`).join(' ') : '无'}</td>
              <td style="color:${r==='pass'?'#16a34a':r==='fail'?'#c44536':'#94a3b8'};font-weight:600;">${r==='pass'?'通过':r==='fail'?'不通过':'未审核'}</td>
              <td>${exam.nodeComments?.[n.id]||''}</td>
            </tr>`;
          }).join('')}
        </table>
        <div style="background:#f8f8f8;padding:0.8rem;border-radius:6px;margin:0.5rem 0;"><strong>总评语：</strong>${exam.comment||'无'}</div>
        <button class="no-print" onclick="window.print()">🖨️ 打印 / 导出PDF</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#crClose').addEventListener('click', closeReport);
  }

  // ========== 答题者上传 ==========
  async function renderCandidateUpload(isResubmit = false) {
    const exams = getExamsRaw();
    const exam = exams.find(e => e.taskId === currentUser.taskId && e.candidateName === currentUser.username);
    if (!exam) { toast('未找到任务'); currentUser=null; renderLogin(); return; }
    if (!isResubmit && exam.status === EXAM_STATUS.REVIEWED) {
      const failedNodes = Object.entries(exam.reviewResults||{}).filter(([,v])=>v==='fail').length;
      if (failedNodes > 0) {
        if (confirm('该考核已审核，有'+failedNodes+'个节点不通过。要重新提交吗？')) { isResubmit = true; }
        else { currentUser=null; renderLogin(); return; }
      } else {
        toast('该任务已审核完成'); currentUser=null; renderLogin(); return;
      }
    }

    const ss = await loadScreenshots(exam.taskId);
    const nodes = getFullNodes(exam);
    // 重提交时，清除之前不通过节点的截图
    if (isResubmit && exam.reviewResults) {
      for (const n of nodes) {
        if (exam.reviewResults[n.id] === 'fail') {
          ss[n.id] = [];
          await saveNodeImgs(exam.taskId, n.id, []);
        }
      }
      // 清除旧的审核结果
      exam.reviewResults = {};
      exam.nodeComments = {};
      exam.comment = '';
      exam.resubmitCount = (exam.resubmitCount || 0) + 1;
      exam.status = EXAM_STATUS.SUBMITTED;
      saveExams(exams);
    }

    function renderProgress() {
      const done = nodes.filter(n => (ss[n.id] || []).length > 0).length;
      const pct = nodes.length ? Math.round(done / nodes.length * 100) : 0;
      const el = document.getElementById('progressFill');
      const txt = document.getElementById('progressText');
      if (el) el.style.width = pct + '%';
      if (txt) txt.textContent = `已完成 ${done}/${nodes.length} 个节点（${pct}%）`;
    }

    function renderNodeUI() {
      const logistics = exam.logistics || exam.payment || '';
      app.innerHTML = `
        <h1>答题者：${exam.candidateName}</h1>
        <p>任务ID：${exam.taskId} | ${TYPE_LABELS[exam.type]||exam.type} | 物流：${logistics||'无'} | 税费：${exam.tax||'无'} ${isResubmit ? '<span style="color:#e65100;">| 🔄 重新提交</span>' : ''}</p>
        ${exam.resubmitCount ? `<p style="color:#64748b;">已重新提交 ${exam.resubmitCount} 次</p>` : ''}
        <div class="progress-text" id="progressText"></div>
        <div class="progress-bar"><div class="fill" id="progressFill" style="width:0%;"></div></div>
        <div style="background:#f0f4ff;padding:0.8rem;border-radius:6px;margin-bottom:1rem;">
          <strong>本次考核节点（共${nodes.length}个）：</strong> ${nodes.map((n,i)=>`${i+1}.${n.name}`).join(' → ')}
        </div>
        ${nodes.map((n,i) => {
          const urls = ss[n.id] || [];
          const isFailed = isResubmit && exam.reviewResults && exam.reviewResults[n.id] === 'fail';
          return `<div class="card" id="card-${n.id}">
            <strong>${i+1}. ${n.name}</strong>
            <p style="color:#64748b;">${n.guide}</p>
            <div class="img-list" id="imgs-${n.id}">
              ${urls.map((url,j) => `<div class="img-item"><img src="${url}" onclick="showLightbox('${url.replace(/'/g,"\\'")}')"><button class="remove-img" data-node="${n.id}" data-idx="${j}">×</button></div>`).join('')}
            </div>
            ${urls.length < MAX_IMAGES_PER_NODE ? `
              <button class="uploadBtn" data-node="${n.id}">📷 上传截图</button>
              <button class="cameraBtn" data-node="${n.id}" style="background:#16a34a;">📸 拍照</button>
              <button class="pasteBtn" data-node="${n.id}" style="background:#6d28d9;">📋 粘贴 (Ctrl+V)</button>
            ` : ''}
            <input type="file" accept="image/*" id="file-${n.id}" style="display:none;" multiple>
            <input type="file" accept="image/*" capture="environment" id="camera-${n.id}" style="display:none;">
          </div>`;
        }).join('')}
        <div class="no-print">
          <button id="submitExamBtn" class="success">提交考核</button>
          <button id="saveDraftBtn" class="secondary">暂存草稿</button>
          <button id="backToDashBtn" class="secondary">返回</button>
        </div>
      `;
      renderProgress();
      bindEvents();
    }

    function bindEvents() {
      document.querySelectorAll('.uploadBtn').forEach(b => {
        b.addEventListener('click', function(){ document.getElementById('file-'+this.dataset.node).click(); });
      });
      document.querySelectorAll('.cameraBtn').forEach(b => {
        b.addEventListener('click', function(){ document.getElementById('camera-'+this.dataset.node).click(); });
      });
      // 粘贴截图（按钮点击 + Ctrl+V 键盘 + 右键粘贴）
      let currentPasteNode = nodes.length > 0 ? nodes[0].id : null;

      // 点击卡片任意位置 → 设为当前粘贴目标
      document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function(e) {
          if (e.target.closest('button') || e.target.closest('img')) return;
          const nodeId = this.id.replace('card-', '');
          if (nodeId) currentPasteNode = nodeId;
        });
      });

      document.querySelectorAll('.pasteBtn').forEach(b => {
        b.addEventListener('click', async function(){
          currentPasteNode = this.dataset.node;
          await doClipboardPaste(this.dataset.node);
        });
      });

      // Ctrl+V / Cmd+V 键盘粘贴
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          // 不阻止默认行为，让 paste 事件自然触发
        }
      });

      document.addEventListener('paste', async function(e) {
        // 检查焦点是否在 input/textarea 中（不拦截文本粘贴）
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

        const items = e.clipboardData ? e.clipboardData.items : [];
        const imageItems = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) imageItems.push(items[i].getAsFile());
        }
        if (imageItems.length === 0) return;

        e.preventDefault();
        const targetNode = currentPasteNode || nodes[0].id;
        const current = ss[targetNode] || [];
        if (current.length >= MAX_IMAGES_PER_NODE) {
          toast('该节点已达上传上限');
          return;
        }
        const btn = document.querySelector(`.pasteBtn[data-node="${targetNode}"]`);
        setLoading(btn, true);
        let pasted = 0;
        for (const file of imageItems) {
          if (current.length + pasted >= MAX_IMAGES_PER_NODE) break;
          const dataURL = await compressImage(file);
          current.push(dataURL);
          pasted++;
        }
        ss[targetNode] = current;
        await saveNodeImgs(exam.taskId, targetNode, current);
        updateImgList(targetNode, current);
        renderProgress();
        setLoading(btn, false);
        if (pasted > 0) toast(`Ctrl+V 已粘贴 ${pasted} 张到当前节点`);
      });

      // 右键菜单粘贴
      document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('contextmenu', function(e) {
          const nodeId = this.id.replace('card-', '');
          if (!nodeId) return;
          currentPasteNode = nodeId;
          const current = ss[nodeId] || [];
          if (current.length >= MAX_IMAGES_PER_NODE) return;
          e.preventDefault();
          const menu = document.createElement('div');
          menu.style.cssText = 'position:fixed;z-index:99999;background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:0.5rem 0;min-width:180px;';
          menu.style.left = e.clientX + 'px';
          menu.style.top = e.clientY + 'px';
          menu.innerHTML = `
            <div class="ctx-item" data-action="paste" style="padding:0.6rem 1rem;cursor:pointer;font-size:0.95rem;">📋 粘贴截图</div>
            <div class="ctx-item" data-action="upload" style="padding:0.6rem 1rem;cursor:pointer;font-size:0.95rem;">📷 上传截图</div>
            <div class="ctx-item" data-action="camera" style="padding:0.6rem 1rem;cursor:pointer;font-size:0.95rem;">📸 拍照</div>
          `;
          document.body.appendChild(menu);
          const closeMenu = () => { if (menu.parentNode) menu.remove(); };
          menu.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.background = '#f0f4ff');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('click', async () => {
              closeMenu();
              const action = item.dataset.action;
              if (action === 'paste') await doClipboardPaste(nodeId);
              else if (action === 'upload') document.getElementById('file-' + nodeId).click();
              else if (action === 'camera') document.getElementById('camera-' + nodeId).click();
            });
          });
          document.addEventListener('click', closeMenu, { once: true });
        });
      });

      async function doClipboardPaste(nodeId) {
        try {
          const items = await navigator.clipboard.read();
          const current = ss[nodeId] || [];
          if (current.length >= MAX_IMAGES_PER_NODE) { toast('该节点已达上传上限'); return; }
          let pasted = 0;
          for (const item of items) {
            if (!item.types.some(t => t.startsWith('image/'))) continue;
            if (pasted + current.length >= MAX_IMAGES_PER_NODE) break;
            const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
            const dataURL = await new Promise(resolve => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target.result);
              reader.readAsDataURL(blob);
            });
            current.push(dataURL);
            ss[nodeId] = current;
            await saveNodeImgs(exam.taskId, nodeId, current);
            pasted++;
          }
          if (pasted > 0) {
            updateImgList(nodeId, ss[nodeId]);
            renderProgress();
            toast(`已粘贴 ${pasted} 张截图`);
          } else {
            toast('剪贴板中没有图片，请先用截图工具复制');
          }
        } catch(e) { toast('粘贴失败，请用 Ctrl+V 快捷键粘贴'); }
      }
      // 文件上传
      document.querySelectorAll('input[type=file]').forEach(input => {
        input.addEventListener('change', async function(e) {
          const nodeId = this.id.replace(/^(file|camera)-/, '');
          const files = Array.from(e.target.files);
          const current = ss[nodeId] || [];
          if (current.length + files.length > MAX_IMAGES_PER_NODE) return toast(`最多上传${MAX_IMAGES_PER_NODE}张图片`);
          const btn = document.querySelector(`.uploadBtn[data-node="${nodeId}"]`) || document.querySelector(`.cameraBtn[data-node="${nodeId}"]`) || document.querySelector(`.pasteBtn[data-node="${nodeId}"]`);
          setLoading(btn, true);
          for (const file of files) {
            const dataURL = await compressImage(file);
            current.push(dataURL);
          }
          ss[nodeId] = current;
          await saveNodeImgs(exam.taskId, nodeId, current);
          updateImgList(nodeId, current);
          renderProgress();
          setLoading(btn, false);
          this.value = '';
        });
      });
      // 删除
      document.querySelectorAll('.remove-img').forEach(btn => {
        btn.addEventListener('click', async function(e) {
          e.stopPropagation();
          const nodeId = this.dataset.node;
          const idx = parseInt(this.dataset.idx);
          const arr = ss[nodeId] || [];
          arr.splice(idx, 1);
          ss[nodeId] = arr;
          await saveNodeImgs(exam.taskId, nodeId, arr);
          updateImgList(nodeId, arr);
          renderProgress();
        });
      });
      // 提交
      document.getElementById('submitExamBtn').addEventListener('click', async function(){
        const missing = nodes.filter(n => (ss[n.id] || []).length === 0);
        if (missing.length && !confirm(`有 ${missing.length} 个节点未上传截图，确定提交？`)) return;
        setLoading(this, true);
        for (const n of nodes) {
          await saveNodeImgs(exam.taskId, n.id, ss[n.id] || []);
        }
        exam.status = EXAM_STATUS.SUBMITTED;
        saveExams(exams);
        toast('提交成功');
        renderCandidateDashboard();
      });
      // 暂存
      document.getElementById('saveDraftBtn').addEventListener('click', async function(){
        setLoading(this, true);
        for (const n of nodes) {
          await saveNodeImgs(exam.taskId, n.id, ss[n.id] || []);
        }
        saveExams(exams);
        setLoading(this, false);
        toast('草稿已保存');
      });
      document.getElementById('backToDashBtn').addEventListener('click', ()=>renderCandidateDashboard());
    }

    function updateImgList(nodeId, arr) {
      const container = document.getElementById('imgs-'+nodeId);
      if (!container) return;
      container.innerHTML = (arr||[]).map((url,j) =>
        `<div class="img-item"><img src="${url}" onclick="showLightbox('${url.replace(/'/g,"\\'")}')"><button class="remove-img" data-node="${nodeId}" data-idx="${j}">×</button></div>`
      ).join('');
      container.querySelectorAll('.remove-img').forEach(b => b.addEventListener('click', async function(e){
        e.stopPropagation();
        const nid = this.dataset.node, ix = parseInt(this.dataset.idx);
        const a = ss[nid] || []; a.splice(ix,1); ss[nid] = a;
        await saveNodeImgs(exam.taskId, nid, a);
        updateImgList(nid, a);
        renderProgress();
      }));
      const ub = document.querySelector(`.uploadBtn[data-node="${nodeId}"]`);
      const cb = document.querySelector(`.cameraBtn[data-node="${nodeId}"]`);
      const pb = document.querySelector(`.pasteBtn[data-node="${nodeId}"]`);
      if (ub) ub.style.display = (arr||[]).length < MAX_IMAGES_PER_NODE ? 'inline-block' : 'none';
      if (cb) cb.style.display = (arr||[]).length < MAX_IMAGES_PER_NODE ? 'inline-block' : 'none';
      if (pb) pb.style.display = (arr||[]).length < MAX_IMAGES_PER_NODE ? 'inline-block' : 'none';
    }

    renderNodeUI();
  }

  // ========== 考核官面板 ==========
  function renderExaminerDashboard(filter = '') {
    const exams = getExams();
    app.innerHTML = `
      <h1>考核官面板</h1>
      <div class="no-print">
        <button id="createExamBtn">＋ 创建新考核</button>
        <button id="templateBtn">📋 模板管理</button>
        <button id="backupBtn">💾 数据备份</button>
        <button id="restoreBtn">📥 导入数据</button>
        <button id="settingsBtn" style="background:#64748b;">⚙️ 设置</button>
        <button id="logoutBtn" class="secondary">退出</button>
      </div>
      <div class="form-row no-print" style="margin-top:1rem;">
        <div class="form-group"><input type="text" id="searchInput" placeholder="搜索姓名/任务ID" value="${filter}"></div>
        <div class="form-group"><select id="statusFilter"><option value="">全部状态</option><option value="${EXAM_STATUS.PENDING}">待提交</option><option value="${EXAM_STATUS.SUBMITTED}">已提交</option><option value="${EXAM_STATUS.REVIEWED}">已审核</option></select></div>
        <button id="searchBtn">🔍 搜索</button>
      </div>
      <h2>考核任务列表</h2>
      <div style="overflow-x:auto;">
      <table class="task-list">
        <thead><tr><th>任务ID</th><th>订单类型</th><th>答题者</th><th>物流/税费</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody id="taskTable"></tbody>
      </table>
      </div>
    `;
    renderExamTable(exams, filter);

    function onSearch() { renderExaminerDashboard(document.getElementById('searchInput').value); }
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(onSearch, 300); });
    document.getElementById('searchBtn').addEventListener('click', onSearch);
    document.getElementById('statusFilter').addEventListener('change', onSearch);
    document.getElementById('createExamBtn').addEventListener('click', ()=>renderCreateExam());
    document.getElementById('templateBtn').addEventListener('click', renderTemplateManager);
    document.getElementById('logoutBtn').addEventListener('click', ()=>{ currentUser=null; renderLogin(); });
    document.getElementById('backupBtn').addEventListener('click', exportData);
    document.getElementById('restoreBtn').addEventListener('click', ()=>importData().then(()=>renderExaminerDashboard()));
    document.getElementById('settingsBtn').addEventListener('click', renderSettings);
    document.querySelectorAll('.viewBtn').forEach(b=>b.addEventListener('click', ()=>showExamDetail(b.dataset.id)));
    document.querySelectorAll('.reviewBtn').forEach(b=>b.addEventListener('click', ()=>renderReview(b.dataset.id)));
    document.querySelectorAll('.reportBtn').forEach(b=>b.addEventListener('click', ()=>showReport(b.dataset.id)));
  }

  function renderExamTable(exams, filter) {
    const sf = document.getElementById('statusFilter')?.value;
    const filtered = exams.filter(e => {
      if (filter && !e.taskId.includes(filter) && !e.candidateName.includes(filter)) return false;
      if (sf && e.status !== sf) return false;
      return true;
    });
    document.getElementById('taskTable').innerHTML = filtered.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:2rem;">暂无记录</td></tr>'
      : filtered.map(e => {
          const statusLabel = e.status === EXAM_STATUS.SUBMITTED ? '已提交' : e.status === EXAM_STATUS.REVIEWED ? '已审核' : '待提交';
          const logistics = e.logistics || e.payment || '';
          const resubmitTag = e.resubmitCount ? ` 🔄` : '';
          return `<tr>
            <td>${e.taskId}${resubmitTag}</td>
            <td>${TYPE_LABELS[e.type]||e.type}</td>
            <td>${e.candidateName}</td>
            <td>${logistics||'-'} / ${e.tax||'-'}</td>
            <td>${statusLabel}</td>
            <td>${new Date(e.createTime).toLocaleString()}</td>
            <td>
              <button class="viewBtn" data-id="${e.taskId}">查看</button>
              ${e.status === EXAM_STATUS.SUBMITTED ? `<button class="reviewBtn" data-id="${e.taskId}">审核</button>` : ''}
              ${e.status === EXAM_STATUS.REVIEWED ? `<button class="reportBtn" data-id="${e.taskId}">成绩单</button>` : ''}
            </td>
          </tr>`;
        }).join('');
  }

  // ========== 创建考核（支持批量） ==========
  function renderCreateExam(template = null) {
    const templates = getTemplates();
    let tempCustomNodes = template?.customNodes ? template.customNodes.map(c => ({ ...c })) : [];
    const suggestedName = template ? template.name + '-' : '';

    function renderCustomList() {
      const container = document.getElementById('customNodesList');
      if (!container) return;
      container.innerHTML = tempCustomNodes.map((c, idx) => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem;">
          <div><strong>${c.name}</strong> — ${c.guide}</div>
          <button class="delCustomBtn danger" data-idx="${idx}" style="padding:0.3rem 0.8rem;">删除</button>
        </div>
      `).join('');
      document.querySelectorAll('.delCustomBtn').forEach(b => b.addEventListener('click', function(){
        tempCustomNodes.splice(parseInt(this.dataset.idx), 1);
        renderCustomList();
        updateNodePreview();
      }));
    }

    function updateNodePreview() {
      const el = document.getElementById('nodePreview');
      if (!el) return;
      const type = document.getElementById('examType').value;
      const base = KANGLEI_NODES[type] || [];
      const extras = EXTRA_NODES.filter(n => document.getElementById('extra_'+n.id)?.checked);
      const all = [...LIANXIN_NODES, ...base, ...extras, ...tempCustomNodes];
      el.innerHTML = `<strong>本次考核节点预览（共${all.length}个）：</strong><br>` + all.map((n,i)=>`${i+1}. ${n.name}`).join('<br>');
    }

    const groupedTpls = { cloud:[], spot:[], future:[] };
    templates.forEach(t => { if (groupedTpls[t.type]) groupedTpls[t.type].push(t); });

    const extraChecks = EXTRA_NODES.map(n =>
      `<label style="display:inline;margin-right:1rem;"><input type="checkbox" value="${n.id}" id="extra_${n.id}" ${template?.extraNodes?.includes(n.id)?'checked':''}> ${n.name}</label>`
    ).join('');

    app.innerHTML = `
      <h1>创建新考核</h1>
      <p style="color:#1e3a6f;font-weight:600;">✅ 已包含联欣审核节点（订单筛选、商品审核），无需额外选择</p>
      ${templates.length > 0 ? `
      <div class="form-row"><div class="form-group"><label>使用模板</label><select id="templateSelect"><option value="">-- 手动设置 --</option>
        <optgroup label="云仓">${groupedTpls.cloud.map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}</optgroup>
        <optgroup label="现货">${groupedTpls.spot.map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}</optgroup>
        <optgroup label="期货">${groupedTpls.future.map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}</optgroup>
      </select></div></div>` : ''}
      <div class="form-row">
        <div class="form-group"><label>订单类型</label><select id="examType"><option value="cloud">云仓</option><option value="spot">现货</option><option value="future">期货</option></select></div>
        <div class="form-group"><label>物流方式</label><select id="logisticsSelect">${LOGISTICS_OPTIONS.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
        <div class="form-group"><label>税费情况</label><select id="taxSelect">${TAX_OPTIONS.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
      </div>
      <div class="form-group">
        <label>答题者姓名（<strong>支持批量</strong>：一行一个，或用逗号/空格分隔）</label>
        <textarea id="candidateNameInput" rows="3" placeholder="${suggestedName ? '建议：'+suggestedName+'张三\n'+suggestedName+'李四' : '张三\n李四\n王五'}"></textarea>
      </div>
      <div class="form-group"><label>可选附加节点（所有类型通用）</label><div>${extraChecks}</div></div>
      <div class="form-group">
        <label>📝 自定义考核节点</label>
        <div class="form-row" style="align-items:center;">
          <input type="text" id="customName" placeholder="节点名称" style="flex:1;">
          <input type="text" id="customGuide" placeholder="操作指引/说明" style="flex:2;">
          <button id="addCustomBtn" style="white-space:nowrap;">添加</button>
        </div>
        <div id="customNodesList"></div>
      </div>
      <div class="form-group" id="nodePreview" style="background:#f0f4ff;padding:1rem;border-radius:8px;"></div>
      <button id="createBtn" class="success">批量生成任务</button>
      <button id="saveTemplateBtn" class="secondary">💾 保存为模板</button>
      <button id="backBtn" class="secondary">返回</button>
    `;

    document.getElementById('examType').addEventListener('change', updateNodePreview);
    document.querySelectorAll('[id^="extra_"]').forEach(cb => cb.addEventListener('change', updateNodePreview));
    updateNodePreview();

    document.getElementById('addCustomBtn').addEventListener('click', ()=>{
      const name = document.getElementById('customName').value.trim();
      const guide = document.getElementById('customGuide').value.trim();
      if (!name || !guide) return toast('请填写节点名称和指引');
      tempCustomNodes.push({ id:'custom_'+Date.now(), name, guide });
      document.getElementById('customName').value = '';
      document.getElementById('customGuide').value = '';
      renderCustomList();
      updateNodePreview();
    });

    document.getElementById('templateSelect')?.addEventListener('change', function(){
      const t = templates.find(x => x.name === this.value);
      if (t) renderCreateExam(t);
    });

    document.getElementById('createBtn').addEventListener('click', function(){
      const raw = document.getElementById('candidateNameInput').value.trim();
      if (!raw) return toast('请输入答题者姓名');
      // 支持换行、逗号、中文逗号、空格分隔
      const names = raw.split(/[\n,，\s]+/).map(s => s.trim()).filter(Boolean);
      if (names.length === 0) return toast('未识别到有效姓名');
      const type = document.getElementById('examType').value;
      const logistics = document.getElementById('logisticsSelect').value;
      const tax = document.getElementById('taxSelect').value;
      const extra = EXTRA_NODES.filter(n => document.getElementById('extra_'+n.id).checked).map(n => n.id);
      const exams = getExamsRaw();
      const created = [];
      for (const name of names) {
        const newExam = {
          taskId: generateId(), type, logistics, tax, extraNodes: extra,
          candidateName: name, status: EXAM_STATUS.PENDING, createTime: Date.now(),
          screenshots: null, reviewResults: {}, nodeComments: {}, comment: '',
          customNodes: tempCustomNodes.map(c => ({ id:c.id, name:c.name, guide:c.guide })),
          resubmitCount: 0
        };
        exams.push(newExam);
        created.push(newExam.taskId);
      }
      saveExams(exams);
      if (names.length === 1) {
        toast(`任务已创建，ID：${created[0]}`);
      } else {
        toast(`已批量创建 ${names.length} 个任务`);
      }
      renderExaminerDashboard();
    });

    document.getElementById('saveTemplateBtn').addEventListener('click', ()=>{
      const type = document.getElementById('examType').value;
      const logistics = document.getElementById('logisticsSelect').value;
      const tax = document.getElementById('taxSelect').value;
      const autoName = makeTemplateName(type, logistics, tax);
      const name = prompt('模板名称：', autoName);
      if (!name) return;
      const extra = EXTRA_NODES.filter(n => document.getElementById('extra_'+n.id).checked).map(n => n.id);
      const t = { name, type, logistics, tax, extraNodes: extra, customNodes: tempCustomNodes.map(c => ({ id:c.id, name:c.name, guide:c.guide })) };
      const all = getTemplates();
      if (all.find(x => x.name === name)) return toast('模板名称已存在');
      all.push(t); saveTemplates(all);
      toast('模板已保存');
    });

    document.getElementById('backBtn').addEventListener('click', ()=>renderExaminerDashboard());

    if (template) {
      document.getElementById('examType').value = template.type;
      document.getElementById('logisticsSelect').value = template.logistics || LOGISTICS_OPTIONS[0];
      document.getElementById('taxSelect').value = template.tax || TAX_OPTIONS[0];
      document.getElementById('candidateNameInput').placeholder = '建议：' + template.name + '-张三';
      if (template.extraNodes) template.extraNodes.forEach(id => { const cb = document.getElementById('extra_'+id); if (cb) cb.checked = true; });
      renderCustomList();
      updateNodePreview();
    }
  }

  // ========== 模板管理 ==========
  function renderTemplateManager() {
    let templates = getTemplates();
    if (templates.length === 0) { generateTemplateLibrary(); templates = getTemplates(); }

    function renderList() {
      const tpls = getTemplates();
      const g = { cloud:[], spot:[], future:[] };
      tpls.forEach(t => { if (g[t.type]) g[t.type].push(t); });
      const sections = [
        { type:'cloud', label:'☁️ 云仓', color:'#e3f2fd' },
        { type:'spot', label:'📦 现货', color:'#fff3e0' },
        { type:'future', label:'📅 期货', color:'#fce4ec' }
      ];
      let html = '';
      for (const s of sections) {
        const items = g[s.type];
        html += `<div style="margin-bottom:1.5rem;"><h3 style="color:#1e3a6f;border-left:6px solid #2d6ee0;padding-left:0.5rem;">${s.label}（${items.length}个）</h3>`;
        if (items.length === 0) {
          html += '<p style="color:#94a3b8;padding:0.5rem 1rem;">暂无模板</p>';
        } else {
          html += items.map(t => {
            const nodes = getFullNodes({ type: t.type, extraNodes: t.extraNodes||[], customNodes:t.customNodes||[] });
            return `<div class="card tpl-card" data-name="${t.name}" style="background:${s.color};">
              <div class="tpl-info">
                <div class="tpl-name-row">
                  <strong class="tpl-name-text">${t.name}</strong>
                  <button class="renameTplBtn" data-name="${t.name}" title="改名" style="padding:0.2rem 0.5rem;font-size:0.8rem;">✏️</button>
                </div>
                <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">
                  物流：${t.logistics||'未设'} | 税费：${t.tax||'未设'} | 节点：${nodes.map(n=>n.name).join(' → ')}
                </div>
              </div>
              <div class="tpl-actions" style="display:flex;gap:0.3rem;flex-shrink:0;">
                <button class="editTplBtn" data-name="${t.name}" style="padding:0.3rem 0.8rem;font-size:0.85rem;">编辑</button>
                <button class="useTplBtn success" data-name="${t.name}" style="padding:0.3rem 0.8rem;font-size:0.85rem;">创建考核</button>
                <button class="delTplBtn danger" data-name="${t.name}" style="padding:0.3rem 0.8rem;font-size:0.85rem;">删除</button>
              </div>
            </div>`;
          }).join('');
        }
        html += '</div>';
      }
      document.getElementById('tplListContainer').innerHTML = html;
      bindTplEvents();
    }

    function bindTplEvents() {
      document.querySelectorAll('.renameTplBtn').forEach(b => b.addEventListener('click', function(e){
        e.stopPropagation();
        const oldName = this.dataset.name;
        const card = document.querySelector(`.tpl-card[data-name="${oldName}"]`);
        const nameEl = card.querySelector('.tpl-name-text');
        const current = nameEl.textContent;
        const input = document.createElement('input');
        input.type = 'text'; input.value = current;
        input.style.cssText = 'font-weight:700;font-size:1rem;padding:0.2rem 0.4rem;border:2px solid #2d6ee0;border-radius:4px;width:80%;';
        nameEl.replaceWith(input);
        input.focus(); input.select();
        const save = () => {
          const newName = input.value.trim();
          if (!newName || newName === current) { renderList(); return; }
          const tpls = getTemplates();
          if (tpls.find(x => x.name === newName)) { toast('模板名称已存在'); renderList(); return; }
          const t = tpls.find(x => x.name === oldName);
          if (t) t.name = newName;
          saveTemplates(tpls);
          renderList();
          toast('模板已改名');
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', e => { if (e.key==='Enter') save(); if (e.key==='Escape') renderList(); });
      }));
      document.querySelectorAll('.editTplBtn').forEach(b => b.addEventListener('click', function(){
        const tpls = getTemplates();
        const t = tpls.find(x => x.name === this.dataset.name);
        if (t) editTemplateModal(t);
      }));
      document.querySelectorAll('.useTplBtn').forEach(b => b.addEventListener('click', function(){
        const tpls = getTemplates();
        const t = tpls.find(x => x.name === this.dataset.name);
        if (t) renderCreateExam(t);
      }));
      document.querySelectorAll('.delTplBtn').forEach(b => b.addEventListener('click', function(){
        if (!confirm('确定删除模板"' + this.dataset.name + '"？')) return;
        let tpls = getTemplates();
        tpls = tpls.filter(x => x.name !== this.dataset.name);
        saveTemplates(tpls);
        renderList();
        toast('模板已删除');
      }));
    }

    app.innerHTML = `
      <h1>模板管理</h1>
      <div class="no-print" style="margin-bottom:1.5rem;">
        <button id="genTplBtn" class="success">🎯 一键生成12个题库模板</button>
        <button id="backToDash" class="secondary">返回</button>
      </div>
      <div id="tplListContainer"></div>
    `;
    renderList();
    document.getElementById('backToDash').addEventListener('click', ()=>renderExaminerDashboard());
    document.getElementById('genTplBtn').addEventListener('click', ()=>{
      const cnt = generateTemplateLibrary();
      if (cnt > 0) { renderList(); toast(`已生成 ${cnt} 个新模板`); }
      else toast('所有模板已存在，无需生成');
    });
  }

  function editTemplateModal(template) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const tempCustomNodes = (template.customNodes || []).map(c => ({ ...c }));
    const tempExtra = [...(template.extraNodes || [])];

    function renderNodePreview() {
      const type = document.getElementById('editTplType').value;
      const base = KANGLEI_NODES[type] || [];
      const extras = EXTRA_NODES.filter(n => tempExtra.includes(n.id));
      const all = [...LIANXIN_NODES, ...base, ...extras, ...tempCustomNodes];
      const el = document.getElementById('editNodePreview');
      if (el) el.innerHTML = `<strong>节点预览（共${all.length}个）：</strong><br>` + all.map((n,i)=>`${i+1}. ${n.name}`).join('<br>');
    }

    function renderCustomList() {
      const c = document.getElementById('editCustomNodes');
      if (!c) return;
      c.innerHTML = tempCustomNodes.map((n,idx) => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem;">
          <div><strong>${n.name}</strong> — ${n.guide}</div>
          <button class="delCustomBtn danger" data-idx="${idx}" style="padding:0.3rem 0.8rem;">删除</button>
        </div>
      `).join('');
      c.querySelectorAll('.delCustomBtn').forEach(b => b.addEventListener('click', function(){
        tempCustomNodes.splice(parseInt(this.dataset.idx), 1);
        renderCustomList();
        renderNodePreview();
      }));
    }

    const extraChecks = EXTRA_NODES.map(n =>
      `<label style="display:inline;margin-right:1rem;"><input type="checkbox" value="${n.id}" id="editExtra_${n.id}" ${tempExtra.includes(n.id)?'checked':''}> ${n.name}</label>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-content">
        <h2>编辑模板：${template.name}</h2>
        <div class="form-group"><label>模板名称</label><input type="text" id="editTplName" value="${template.name}"></div>
        <div class="form-row">
          <div class="form-group"><label>订单类型</label><select id="editTplType"><option value="cloud" ${template.type==='cloud'?'selected':''}>云仓</option><option value="spot" ${template.type==='spot'?'selected':''}>现货</option><option value="future" ${template.type==='future'?'selected':''}>期货</option></select></div>
          <div class="form-group"><label>物流方式</label><select id="editTplLogistics">${LOGISTICS_OPTIONS.map(v=>`<option value="${v}" ${template.logistics===v?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="form-group"><label>税费情况</label><select id="editTplTax">${TAX_OPTIONS.map(v=>`<option value="${v}" ${template.tax===v?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>通用附加节点</label><div>${extraChecks}</div></div>
        <div class="form-group">
          <label>📝 自定义节点</label>
          <div class="form-row" style="align-items:center;">
            <input type="text" id="editCustomName" placeholder="节点名称" style="flex:1;">
            <input type="text" id="editCustomGuide" placeholder="操作指引" style="flex:2;">
            <button id="editAddCustomBtn" style="white-space:nowrap;">添加</button>
          </div>
          <div id="editCustomNodes"></div>
        </div>
        <div id="editNodePreview" style="background:#f0f4ff;padding:1rem;border-radius:8px;margin-bottom:1rem;"></div>
        <button id="editSaveBtn" class="success">保存修改</button>
        <button id="editCancelBtn" class="secondary">取消</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('editTplType').addEventListener('change', renderNodePreview);
    document.getElementById('editAddCustomBtn').addEventListener('click', ()=>{
      const n = document.getElementById('editCustomName').value.trim();
      const g = document.getElementById('editCustomGuide').value.trim();
      if (!n || !g) return toast('请填写节点名称和指引');
      tempCustomNodes.push({ id:'custom_'+Date.now(), name:n, guide:g });
      document.getElementById('editCustomName').value = '';
      document.getElementById('editCustomGuide').value = '';
      renderCustomList();
      renderNodePreview();
    });
    document.getElementById('editSaveBtn').addEventListener('click', ()=>{
      const newName = document.getElementById('editTplName').value.trim();
      if (!newName) return toast('请输入模板名称');
      const tpls = getTemplates();
      if (newName !== template.name && tpls.find(x => x.name === newName)) return toast('模板名称已存在');
      const t = tpls.find(x => x.name === template.name);
      if (!t) return;
      t.name = newName;
      t.type = document.getElementById('editTplType').value;
      t.logistics = document.getElementById('editTplLogistics').value;
      t.tax = document.getElementById('editTplTax').value;
      t.extraNodes = EXTRA_NODES.filter(n => document.getElementById('editExtra_'+n.id).checked).map(n => n.id);
      t.customNodes = tempCustomNodes.map(c => ({ id:c.id, name:c.name, guide:c.guide }));
      saveTemplates(tpls);
      overlay.remove();
      renderTemplateManager();
      toast('模板已更新');
    });
    document.getElementById('editCancelBtn').addEventListener('click', ()=>overlay.remove());
    overlay.querySelector('.modal-close')?.addEventListener('click', ()=>overlay.remove());
    renderCustomList();
    renderNodePreview();
  }

  // ========== 查看详情 ==========
  async function showExamDetail(taskId) {
    const exams = getExamsRaw();
    const exam = exams.find(e => e.taskId === taskId);
    if (!exam) return;
    const ss = await loadScreenshots(taskId);
    const nodes = getFullNodes(exam);
    app.innerHTML = `
      <h1>任务详情</h1>
      <p>${exam.candidateName} / ${exam.taskId}</p>
      ${nodes.map((n,i) => {
        const urls = ss[n.id] || [];
        return `<div class="card">
          <strong>${i+1}. ${n.name}</strong>
          <div class="img-list">${urls.length ? urls.map(u => `<img src="${u}" style="max-width:120px;cursor:pointer;" onclick="showLightbox('${u.replace(/'/g, "\\'")}')">`).join('') : '无截图'}</div>
        </div>`;
      }).join('')}
      <button id="backBtn" class="secondary">返回</button>
    `;
    document.getElementById('backBtn').addEventListener('click', ()=>renderExaminerDashboard());
  }

  // ========== 审核界面 ==========
  async function renderReview(taskId) {
    const exams = getExamsRaw();
    const exam = exams.find(e => e.taskId === taskId);
    if (!exam || exam.status !== EXAM_STATUS.SUBMITTED) { toast('无法审核'); renderExaminerDashboard(); return; }
    const ss = await loadScreenshots(taskId);
    const nodes = getFullNodes(exam);
    if (!exam.reviewResults) exam.reviewResults = {};
    if (!exam.nodeComments) exam.nodeComments = {};

    app.innerHTML = `
      <h1>审核：${exam.candidateName} ${exam.resubmitCount ? '<span style="color:#e65100;">（重新提交第'+exam.resubmitCount+'次）</span>' : ''}</h1>
      <p>任务ID：${exam.taskId} | 类型：${TYPE_LABELS[exam.type]||exam.type}</p>
      <button id="passAllBtn" class="secondary" style="margin-bottom:1rem;">一键全部通过</button>
      ${nodes.map((n,i) => {
        const urls = ss[n.id] || [];
        return `<div class="card">
          <strong>${i+1}. ${n.name}</strong>
          <div class="img-list">${urls.length ? urls.map(u => `<img src="${u}" style="max-width:120px;cursor:pointer;" onclick="showLightbox('${u.replace(/'/g,"\\'")}')">`).join('') : '<span style="color:#c44536;">未上传</span>'}</div>
          <textarea class="nodeComment" data-node="${n.id}" placeholder="节点评语（可选）" style="margin-top:0.5rem;">${exam.nodeComments[n.id]||''}</textarea>
          <div class="review-btns" data-node="${n.id}">
            <button class="pass" data-result="pass">✅ 通过</button>
            <button class="fail" data-result="fail">❌ 不通过</button>
          </div>
        </div>`;
      }).join('')}
      <div class="form-group"><label>总评语</label><textarea id="overallComment" rows="3">${exam.comment||''}</textarea></div>
      <button id="submitReview" class="success">提交审核</button>
      <button id="backReview" class="secondary">返回</button>
    `;

    function updateButtons() {
      nodes.forEach(n => {
        const cont = document.querySelector(`.review-btns[data-node="${n.id}"]`);
        if (!cont) return;
        cont.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', b.dataset.result === exam.reviewResults[n.id]);
        });
      });
    }
    updateButtons();

    document.querySelectorAll('.review-btns button').forEach(b => b.addEventListener('click', function(){
      exam.reviewResults[this.parentElement.dataset.node] = this.dataset.result;
      updateButtons();
    }));
    document.getElementById('passAllBtn').addEventListener('click', ()=>{
      nodes.forEach(n => exam.reviewResults[n.id] = 'pass');
      updateButtons();
    });
    document.getElementById('submitReview').addEventListener('click', ()=>{
      const pending = nodes.filter(n => !exam.reviewResults[n.id]);
      if (pending.length > 0 && !confirm(`还有 ${pending.length} 个节点未审核，确定提交？`)) return;
      document.querySelectorAll('.nodeComment').forEach(ta => exam.nodeComments[ta.dataset.node] = ta.value);
      exam.comment = document.getElementById('overallComment').value;
      exam.status = EXAM_STATUS.REVIEWED;
      saveExams(exams);
      toast('审核完成');
      showReport(taskId);
    });
    document.getElementById('backReview').addEventListener('click', ()=>renderExaminerDashboard());
  }

  // ========== 成绩单 ==========
  async function showReport(taskId) {
    const exams = getExamsRaw();
    const exam = exams.find(e => e.taskId === taskId);
    if (!exam) return;
    const ss = await loadScreenshots(taskId);
    const nodes = getFullNodes(exam);
    const passed = nodes.filter(n => exam.reviewResults?.[n.id] === 'pass').length;
    const failed = nodes.filter(n => exam.reviewResults?.[n.id] === 'fail').length;
    const logistics = exam.logistics || exam.payment || '';

    function closeReport() { overlay.remove(); renderExaminerDashboard(); }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeReport(); });
    overlay.innerHTML = `
      <div class="modal-content">
        <button class="modal-close no-print">✕ 关闭</button>
        <h1 style="border-bottom:3px solid #2d6ee0;padding-bottom:0.8rem;">考核成绩单</h1>
        <p><strong>答题者：</strong>${exam.candidateName} | <strong>任务ID：</strong>${exam.taskId}</p>
        <p><strong>类型：</strong>${TYPE_LABELS[exam.type]||exam.type} | 物流：${logistics||'无'} | 税费：${exam.tax||'无'} ${exam.resubmitCount ? '| 重提交：'+exam.resubmitCount+'次' : ''}</p>
        <p><strong>结果：</strong>通过 ${passed}/${nodes.length} | 不通过 ${failed}/${nodes.length}</p>
        <table>
          <tr><th>序号</th><th>节点</th><th>截图</th><th>结果</th><th>评语</th></tr>
          ${nodes.map((n,i) => {
            const r = exam.reviewResults?.[n.id];
            const urls = ss[n.id] || [];
            return `<tr>
              <td>${i+1}</td><td>${n.name}</td>
              <td>${urls.length ? urls.map(u => `<img src="${u}" style="max-width:80px;cursor:pointer;" onclick="showLightbox('${u.replace(/'/g,"\\'")}')">`).join(' ') : '无'}</td>
              <td style="color:${r==='pass'?'#16a34a':r==='fail'?'#c44536':'#94a3b8'};font-weight:600;">${r==='pass'?'通过':r==='fail'?'不通过':'未审核'}</td>
              <td>${exam.nodeComments?.[n.id]||''}</td>
            </tr>`;
          }).join('')}
        </table>
        <div style="background:#f8f8f8;padding:0.8rem;border-radius:6px;margin:0.5rem 0;"><strong>总评语：</strong>${exam.comment||'无'}</div>
        <p style="color:#64748b;">考核官：${currentUser?.username} | 日期：${new Date().toLocaleDateString()}</p>
        <button class="no-print" onclick="window.print()">🖨️ 打印 / 导出PDF</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', closeReport);
  }

  // ========== 数据导入导出 ==========
  async function exportData() {
    const exams = getExamsRaw();
    for (const exam of exams) {
      const ss = await imgGetAll(exam.taskId);
      exam.screenshots = ss;
    }
    const data = { exams, templates: getTemplates() };
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '考核数据备份.json';
    a.click();
    toast('数据已导出');
  }

  async function importData() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return resolve();
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.exams) throw new Error();
          if (!confirm('导入将覆盖当前数据，确定吗？')) return resolve();
          const oldExams = getExamsRaw();
          for (const exam of oldExams) await imgDeleteAll(exam.taskId);
          for (const exam of data.exams) {
            if (exam.screenshots) {
              for (const [nodeId, urls] of Object.entries(exam.screenshots)) {
                if (urls && urls.length > 0) await imgSet(exam.taskId, nodeId, urls);
              }
              delete exam.screenshots;
            }
          }
          setStore('exams', data.exams);
          setStore('templates', data.templates || []);
          _ssCache.clear();
          toast('导入成功');
          resolve();
        } catch(e) {
          toast('无效备份文件');
          resolve();
        }
      };
      input.click();
    });
  }

  // ========== 设置页面 ==========
  function renderSettings() {
    const sharedPwd = getStore('sharedExamPassword', '');
    app.innerHTML = '<h1>⚙️ 设置</h1>'
      + '<div class="card" style="max-width:500px;">'
      + '<div class="form-group"><label>答题者共享考核密码</label><input type="text" id="sharedPwdInput" value="'+sharedPwd+'" placeholder="设密码后答题者需输入才能登录">'
      + '<span style="color:#94a3b8;font-size:0.8rem;">不设则任何人输入姓名即可登录</span></div>'
      + '<button id="saveSettingsBtn" class="success">保存设置</button>'
      + '<button id="cancelSettingsBtn" class="secondary">返回</button></div>';
    document.getElementById('saveSettingsBtn').addEventListener('click', ()=>{
      const val = document.getElementById('sharedPwdInput').value.trim();
      setStore('sharedExamPassword', val);
      toast(val ? '考核密码已设置' : '考核密码已取消，答题者可任意登录');
      renderExaminerDashboard();
    });
    document.getElementById('cancelSettingsBtn').addEventListener('click', ()=>renderExaminerDashboard());
  }

  // ========== 启动 ==========
  async function init() {
    await migrateOldData();
    if (restoreLogin()) {
      if (currentUser.role === 'examiner') return renderExaminerDashboard();
      if (currentUser.role === 'candidate') return renderCandidateDashboard();
    }
    renderLogin();
  }
  init();
})();
