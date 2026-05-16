(function () {
  // 图片加载失败 → 显示占位
  document.querySelectorAll('.screenshot-img').forEach(function (img) {
    function showPlaceholder() {
      var div = document.createElement('div');
      div.className = 'img-placeholder';
      div.textContent = '📷 ' + (img.alt || '截图占位');
      img.parentNode.insertBefore(div, img);
      img.style.display = 'none';
    }
    if (img.complete && img.naturalWidth === 0) {
      showPlaceholder();
      return;
    }
    img.addEventListener('error', showPlaceholder);
  });

  // 回到顶部按钮
  var btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.textContent = '↑';
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(btn);
  window.addEventListener('scroll', function () {
    btn.classList.toggle('show', window.scrollY > 400);
  });

  // 搜索功能
  var searchInput = document.getElementById('searchInput');
  var countEl = document.getElementById('searchCount');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) {
        document.querySelectorAll('.search-highlight').forEach(function (el) {
          var p = el.parentNode;
          p.replaceChild(document.createTextNode(el.textContent), el);
          p.normalize();
        });
        countEl.textContent = '';
        return;
      }
      document.querySelectorAll('.search-highlight').forEach(function (el) {
        var p = el.parentNode;
        p.replaceChild(document.createTextNode(el.textContent), el);
        p.normalize();
      });
      var targets = document.querySelectorAll('.container p, .container li, .container td, .container .flow-text');
      var count = 0;
      targets.forEach(function (el) {
        if (el.closest('.toc') || el.closest('.search-box') || el.closest('.footer')) return;
        var html = el.innerHTML;
        var idx = html.toLowerCase().indexOf(q);
        if (idx === -1) return;
        count++;
        el.innerHTML = html.slice(0, idx) + '<span class="search-highlight">' + html.slice(idx, idx + q.length) + '</span>' + html.slice(idx + q.length);
      });
      countEl.textContent = count ? '找到 ' + count + ' 处匹配' : '未找到匹配内容';
    });
  }
})();
