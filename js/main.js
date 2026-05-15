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

  function clearHighlights(root) {
    root.querySelectorAll('.search-highlight').forEach(function (el) {
      var textNode = document.createTextNode(el.textContent);
      el.parentNode.replaceChild(textNode, el);
    });
    root.normalize();
  }

  function highlightTextNode(node, keyword) {
    var text = node.nodeValue;
    var lower = text.toLowerCase();
    var index = lower.indexOf(keyword);
    if (index === -1) return 0;

    var frag = document.createDocumentFragment();
    var start = 0;
    var count = 0;

    while (index !== -1) {
      if (index > start) {
        frag.appendChild(document.createTextNode(text.slice(start, index)));
      }

      var span = document.createElement('span');
      span.className = 'search-highlight';
      span.textContent = text.slice(index, index + keyword.length);
      frag.appendChild(span);

      count++;
      start = index + keyword.length;
      index = lower.indexOf(keyword, start);
    }

    if (start < text.length) {
      frag.appendChild(document.createTextNode(text.slice(start)));
    }

    node.parentNode.replaceChild(frag, node);
    return count;
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      var container = document.querySelector('.container');
      if (!container) return;

      clearHighlights(container);

      if (!q) {
        if (countEl) countEl.textContent = '';
        return;
      }

      var targets = container.querySelectorAll('p, li, td, .flow-text');
      var total = 0;

      targets.forEach(function (el) {
        if (el.closest('.toc') || el.closest('.search-box') || el.closest('.footer')) return;

        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode: function (node) {
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('search-highlight')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });

        var textNodes = [];
        var current;
        while ((current = walker.nextNode())) {
          textNodes.push(current);
        }

        textNodes.forEach(function (node) {
          total += highlightTextNode(node, q);
        });
      });

      if (countEl) {
        countEl.textContent = total ? '找到 ' + total + ' 处匹配' : '未找到匹配内容';
      }
    });
  }
})();
