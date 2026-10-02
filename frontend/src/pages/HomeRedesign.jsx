import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLoadingSkeleton } from '../components/LoadingStates';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductQuickView from '../components/ProductQuickView';
import Seo from '../components/Seo';

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

const FALLBACK_IMAGES = [
  'allclad-pan-set.jpg', 'breville-barista.jpg', 'cookware.jpg',
  'dutch-oven.jpg', 'espresso.jpg', 'kitchenaid-stand-mixer.jpg',
  'lecreuset-dutch-oven.jpg', 'mixer.jpg', 'multicooker.jpg', 'ninja-foodi.jpg'
];

const CATEGORY_LABELS = {
  'electronics': 'Electronics',
  'fashion': 'Fashion & textiles',
  'beauty': 'Beauty',
  'home-living': 'Home & living',
  'food-drink': 'Agro & foods',
  'kitchen': 'Kitchen',
  'outdoors': 'Outdoors',
  'plants-garden': 'Plants & garden',
  'sports-fitness': 'Sports & fitness',
  'stationery': 'Stationery',
  'toys-games': 'Toys & games',
  'travel': 'Travel',
  'art-craft': 'Art & craft',
};

function getCurrencyCode(currencyStr) {
  if (!currencyStr) return 'NGN';
  const parts = String(currencyStr).split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

function formatPrice(product, formatPriceCurrency) {
  if (formatPriceCurrency) {
    return formatPriceCurrency(Number(product.price || 0), getCurrencyCode(product.currency));
  }
  const symbol = product.currency ? product.currency.split(' ')[0] : '\u20A6';
  return symbol + Number(product.price || 0).toLocaleString();
}

function getProductImage(product, index) {
  if (product.image) return product.image;
  if (product.images && product.images[0]) return product.images[0];
  return '/assets/catalog/' + FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function buildProductCard(product, index, formatPriceCurrency) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.productId = product.id || '';
  card.dataset.category = product.category || 'other';
  card.dataset.productData = JSON.stringify({
    id: product.id, name: product.name, price: product.price,
    image: product.image, images: product.images,
    vendorName: product.vendorName, vendorId: product.vendorId,
    stock: product.stock ?? product.stockQuantity ?? 0,
    inStock: product.inStock ?? ((product.stock ?? product.stockQuantity ?? 0) > 0),
    currency: product.currency, description: product.description,
    category: product.category, rating: product.rating
  }).replace(/'/g, '&#39;');

  const img = getProductImage(product, index);
  card.innerHTML = '<div class="product-thumb" style="position:relative;">'
    + '<img src="' + img + '" alt="' + (product.name || 'Product').replace(/"/g, '&quot;') + '" '
    + 'style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />'
    + '<button class="add-cart-btn" data-action="add-to-cart" '
    + 'style="position:absolute;bottom:8px;right:8px;padding:6px 12px;border-radius:999px;'
    + 'border:none;background:#f97316;color:#fff;font-weight:600;font-size:12px;cursor:pointer;'
    + 'z-index:5;transition:all 0.2s;">\u{1F6D2} Add to Cart</button>'
    + '</div><div class="product-body"><div class="product-name">' + (product.name || 'Product') + '</div>'
    + '<div class="product-meta"><span class="product-price">' + formatPrice(product, formatPriceCurrency) + '</span>'
    + (product.vendorName ? '<span class="product-flag">' + product.vendorName + '</span>' : '')
    + '</div><span class="product-escrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12.5l4.5 4.5L20 6"/></svg>Escrow protected</span>'
    + '</div>';
  return card;
}

function buildCategoryRow(category, products, formatPriceCurrency) {
  const row = document.createElement('div');
  row.className = 'cat-row';
  row.dataset.rowCategory = category;
  const label = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
  row.innerHTML = '<div class="cat-row-head"><h3>' + label + '</h3><a href="#" class="see-all">See all \u2192</a></div>'
    + '<div class="cat-row-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;"></div>';
  const grid = row.querySelector('.cat-row-grid');
  products.forEach((p, i) => grid.appendChild(buildProductCard(p, i, formatPriceCurrency)));
  return row;
}

function buildProductGrid(products, formatPriceCurrency) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;';
  products.forEach((p, i) => grid.appendChild(buildProductCard(p, i, formatPriceCurrency)));
  return grid;
}

const HomeRedesign = () => {
  const hostRef = useRef(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { formatPrice: formatPriceCurrency } = useCurrency();
  const [html, setHtml] = useState(null);
  const [loadingDesign, setLoadingDesign] = useState(true);
  const [shadowReady, setShadowReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);

  const {
    products, loading, meta, filters,
    updateFilter, clearFilters
  } = useProductFilters({ limit: 50, syncURL: false });

  const openProductModal = useCallback((product) => {
    setSelectedProduct(product);
    setShowQuickView(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setShowQuickView(false);
    setSelectedProduct(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/ojawa-homepage-redesign.html', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load home design');
        return r.text();
      })
      .then(text => {
        if (mounted) {
          setHtml(text);
          setLoadingDesign(false);
        }
      })
      .catch(err => {
        console.error('Home design load error:', err);
        if (mounted) setLoadingDesign(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!html || !hostRef.current) return;
    if (hostRef.current.shadowRoot) return;

    const container = hostRef.current;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let css = '';
    doc.querySelectorAll('style').forEach(s => { css += s.textContent; });
    // Map the design's :root/body/html selectors to the shadow host
    // so its CSS variables and typography actually take effect
    css = css
      .replace(':root{', ':host {')
      .replace('html{', ':host {')
      .replace('body{', ':host {');
    const body = doc.body.innerHTML;

    const shadow = container.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
@import url('${FONTS_URL}');
:host { box-sizing: border-box; background: var(--ink); color: var(--paper); display: block; width: 100%; min-height: 100vh; overflow-x: hidden; font-family: var(--body); line-height: 1.5; -webkit-font-smoothing: antialiased; }
.product-card { cursor: pointer; }
header { display: none !important; }
.mobile-menu { display: none !important; }
${css}
</style>${body}`;

    // Clear static placeholder product cards and cat-rows from marketMain
    // (real product data is rendered dynamically by the marketplace rebuild effect)
    const marketMain = shadow.getElementById('marketMain');
    if (marketMain) marketMain.innerHTML = '';

    // Add search-by-name input at the top of the filter sidebar
    const filterPanel = shadow.getElementById('filterPanel');
    if (filterPanel) {
      const searchGroup = document.createElement('div');
      searchGroup.className = 'filter-group';
      searchGroup.style.borderTop = 'none';
      searchGroup.style.paddingTop = '0';
      searchGroup.innerHTML = '<h4>Search by name</h4>'
        + '<input type="text" id="productSearch" placeholder="Search products..." '
        + 'style="width:100%;padding:6px 10px;border:1px solid rgba(22,31,56,0.2);border-radius:8px;'
        + 'font-size:0.9rem;font-family:var(--body);color:var(--ink);background:#fff;outline:none;" />';
      filterPanel.insertBefore(searchGroup, filterPanel.querySelector('.filter-group'));
    }

    // Replace static category checkboxes with dynamic ones from meta
    const filterCategoryGroup = shadow.querySelector('.f-category')?.closest('.filter-group');
    if (filterCategoryGroup) {
      filterCategoryGroup.innerHTML = '<h4>Category</h4><div id="dynamicCategories"></div>';
    }

    const clickHandler = (e) => {
      // Check cart button FIRST (before <a> handling) so it always works
      const cartBtn = e.target.closest && e.target.closest('[data-action="add-to-cart"]');
      if (cartBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = cartBtn.closest('.product-card');
        if (card) {
          let product = null;
          if (card.dataset.productData) {
            try {
              product = JSON.parse(card.dataset.productData.replace(/&#39;/g, "'"));
            } catch { /* ignore */ }
          }
          // Only add to cart if we have real product data with a valid id and vendorId
          if (!product || !product.id || !product.vendorId) {
            cartBtn.innerHTML = 'Loading...';
            cartBtn.style.background = '#6b7280';
            setTimeout(() => {
              cartBtn.innerHTML = '\u{1F6D2} Add to Cart';
              cartBtn.style.background = '#f97316';
            }, 1500);
            return;
          }
          // Ensure stock fields so addToCart doesn't reject
          if (!product.stock && product.stock !== 0) product.stock = 999;
          if (product.inStock === undefined) product.inStock = true;
          
          addToCart(product, 1).then(() => {
            cartBtn.innerHTML = '\u2705 Added!';
            cartBtn.style.background = '#16a34a';
            setTimeout(() => {
              cartBtn.innerHTML = '\u{1F6D2} Add to Cart';
              cartBtn.style.background = '#f97316';
            }, 2000);
          }).catch((err) => {
            cartBtn.innerHTML = '\u274C ' + (err.message || 'Failed');
            cartBtn.style.background = '#dc2626';
            setTimeout(() => {
              cartBtn.innerHTML = '\u{1F6D2} Add to Cart';
              cartBtn.style.background = '#f97316';
            }, 2000);
          });
        }
        return;
      }

      const a = e.target.closest && e.target.closest('a');
      if (a) {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim().toLowerCase();
        const cls = (a.getAttribute('class') || '').toLowerCase();
        e.preventDefault();

        if (href === '#how' || text.includes('how escrow works')) {
          const el = shadow.getElementById('how');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        if (href === '#sell' || text.includes('sell on ojawa')) {
          const el = shadow.getElementById('sell');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        if (href === '#categories' || text.includes('marketplace') || text.includes('start shopping') || cls.includes('see-all')) {
          navigate('/products');
          return;
        }
        if (text.includes('log in')) {
          navigate('/login');
          return;
        }
        if (text.includes('become a vendor')) {
          navigate('/become-vendor');
          return;
        }
        if (text.includes('see seller fees')) {
          navigate('/terms');
          return;
        }
        if (text.includes('track an order')) {
          navigate('/tracking');
          return;
        }
        if (text.includes('dispute resolution')) {
          navigate('/help');
          return;
        }
        if (text.includes('about ojawa') || text.includes('countries we serve') || text.includes('contact support') || text.includes('vendor verification')) {
          navigate('/help');
          return;
        }
        return;
      }

      const card = e.target.closest && e.target.closest('.product-card');
      if (card) {
        let product = null;
        if (card.dataset.productData) {
          try {
            product = JSON.parse(card.dataset.productData.replace(/&#39;/g, "'"));
          } catch { /* ignore */ }
        }
        if (product && product.id) {
          openProductModal(product);
        } else {
          navigate('/products');
        }
      }
    };
    shadow.addEventListener('click', clickHandler);

    // Mobile menu
    const openMenu = shadow.getElementById('openMenu');
    const closeMenu = shadow.getElementById('closeMenu');
    const mobileMenu = shadow.getElementById('mobileMenu');
    const openMenuHandler = () => mobileMenu && mobileMenu.classList.add('open');
    const closeMenuHandler = () => mobileMenu && mobileMenu.classList.remove('open');
    openMenu && openMenu.addEventListener('click', openMenuHandler);
    closeMenu && closeMenu.addEventListener('click', closeMenuHandler);
    const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll('a')) : [];
    mobileLinks.forEach(a => a.addEventListener('click', closeMenuHandler));

    // Filter drawer
    const filtersScrim = shadow.getElementById('filtersScrim');
    const openFilters = shadow.getElementById('openFilters');
    const closeFilters = shadow.getElementById('closeFilters');
    const openFilterPanel = () => {
      filterPanel && filterPanel.classList.add('open');
      filtersScrim && filtersScrim.classList.add('open');
    };
    const closeFilterPanel = () => {
      filterPanel && filterPanel.classList.remove('open');
      filtersScrim && filtersScrim.classList.remove('open');
    };
    openFilters && openFilters.addEventListener('click', openFilterPanel);
    closeFilters && closeFilters.addEventListener('click', closeFilterPanel);
    filtersScrim && filtersScrim.addEventListener('click', closeFilterPanel);

    // Scroll reveal
    const steps = shadow.querySelectorAll('.step');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('in-view'), i * 90);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    steps.forEach(s => io.observe(s));

    // Horizontal scroll buttons
    const scrollBtns = shadow.querySelectorAll('.scroll-btn');
    const scrollHandler = (e) => {
      const btn = e.currentTarget;
      const scroller = btn.parentElement && btn.parentElement.querySelector('.cat-scroll');
      const dir = parseInt(btn.dataset.scroll, 10);
      if (scroller && !Number.isNaN(dir)) scroller.scrollBy({ left: dir * 420, behavior: 'smooth' });
    };
    scrollBtns.forEach(btn => btn.addEventListener('click', scrollHandler));

    // Auto-scroll each category row
    const autoScrollIntervals = [];
    shadow.querySelectorAll('.cat-scroll').forEach(scroller => {
      const step = () => {
        const firstCard = scroller.querySelector('.product-card:not([style*="display: none"])');
        if (!firstCard) return 0;
        return firstCard.offsetWidth + 16;
      };
      let direction = 1;
      const id = setInterval(() => {
        if (!scroller.isConnected) return;
        const s = step();
        if (!s) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        if (max <= 0) return;
        const next = scroller.scrollLeft + direction * s;
        if (direction === 1 && next >= max) {
          scroller.scrollTo({ left: max, behavior: 'smooth' });
          direction = -1;
        } else if (direction === -1 && next <= 0) {
          scroller.scrollTo({ left: 0, behavior: 'smooth' });
          direction = 1;
        } else {
          scroller.scrollBy({ left: direction * s, behavior: 'smooth' });
        }
      }, 3000);
      autoScrollIntervals.push(id);
    });

    // Wire filter controls to useProductFilters hook
    const productSearch = shadow.getElementById('productSearch');
    const categoryChecks = Array.from(shadow.querySelectorAll('.f-category'));
    const priceRange = shadow.getElementById('priceRange');
    const priceLabel = shadow.getElementById('priceLabel');
    const clearBtn = shadow.getElementById('clearFilters');

    const handleSearchInput = (e) => {
      updateFilter('search', e.target.value);
    };
    productSearch && productSearch.addEventListener('input', handleSearchInput);

    const handleCategoryChange = (e) => {
      const checkbox = e.target;
      if (checkbox.checked) {
        categoryChecks.forEach(c => { if (c !== checkbox) c.checked = false; });
        updateFilter('category', checkbox.value);
      } else {
        updateFilter('category', 'all');
      }
    };
    categoryChecks.forEach(c => c.addEventListener('change', handleCategoryChange));

    const handlePriceInput = () => {
      const maxPrice = priceRange ? parseInt(priceRange.value, 10) : 500;
      if (priceLabel) priceLabel.textContent = '$' + maxPrice;
      updateFilter('maxPrice', String(maxPrice));
    };
    priceRange && priceRange.addEventListener('input', handlePriceInput);

    const handleClear = () => {
      if (productSearch) productSearch.value = '';
      categoryChecks.forEach(c => { c.checked = false; });
      if (priceRange) priceRange.value = 500;
      if (priceLabel) priceLabel.textContent = '$500';
      clearFilters();
    };
    clearBtn && clearBtn.addEventListener('click', handleClear);

    // Hero banner rotation
    const heroSlides = shadow.querySelectorAll('.hero-slide');
    const heroDots = shadow.querySelectorAll('.hero-dot');
    let heroInterval = null;
    if (heroSlides.length) {
      let currentHero = 0;
      const showHero = idx => {
        currentHero = idx;
        heroSlides.forEach((s, i) => s.classList.toggle('active', i === idx));
        heroDots.forEach((d, i) => d.classList.toggle('active', i === idx));
      };
      const nextHero = () => showHero((currentHero + 1) % heroSlides.length);
      heroInterval = setInterval(nextHero, 5000);
      heroDots.forEach((d, i) => d.addEventListener('click', () => {
        clearInterval(heroInterval);
        showHero(i);
        heroInterval = setInterval(nextHero, 5000);
      }));
    }

    return () => {
      shadow.removeEventListener('click', clickHandler);
      openMenu && openMenu.removeEventListener('click', openMenuHandler);
      closeMenu && closeMenu.removeEventListener('click', closeMenuHandler);
      mobileLinks.forEach(a => a.removeEventListener('click', closeMenuHandler));
      openFilters && openFilters.removeEventListener('click', openFilterPanel);
      closeFilters && closeFilters.removeEventListener('click', closeFilterPanel);
      filtersScrim && filtersScrim.removeEventListener('click', closeFilterPanel);
      productSearch && productSearch.removeEventListener('input', handleSearchInput);
      categoryChecks.forEach(c => c.removeEventListener('change', handleCategoryChange));
      priceRange && priceRange.removeEventListener('input', handlePriceInput);
      clearBtn && clearBtn.removeEventListener('click', handleClear);
      scrollBtns.forEach(btn => btn.removeEventListener('click', scrollHandler));
      autoScrollIntervals.forEach(clearInterval);
      if (heroInterval) clearInterval(heroInterval);
      io.disconnect();
    };
  }, [html, navigate, addToCart, openProductModal, updateFilter, clearFilters]);

  // Set shadowReady after shadow DOM is set up
  useEffect(() => {
    if (html && hostRef.current?.shadowRoot) setShadowReady(true);
  }, [html]);

  // Rebuild marketplace when products from hook change
  useEffect(() => {
    if (!shadowReady || !hostRef.current?.shadowRoot) return;
    const shadow = hostRef.current.shadowRoot;
    const marketMain = shadow.getElementById('marketMain');
    if (!marketMain) return;

    // Ensure marketMain always fills the available space so the layout doesn't collapse when products are few
    marketMain.style.cssText = 'min-height: 360px; display: flex; flex-direction: column; gap: 24px;';
    marketMain.innerHTML = '';

    if (loading) {
      marketMain.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:48px 24px;color:rgba(22,31,56,0.6);"><div class="animate-spin" style="width:32px;height:32px;border:3px solid rgba(22,31,56,0.15);border-top-color:#C6821F;border-radius:50%;margin:0 auto 12px;animation:spin 1s linear infinite;"></div>Loading products...</div>';
      const styleEl = document.createElement('style');
      styleEl.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      shadow.appendChild(styleEl);
      return;
    }

    if (products.length === 0) {
      marketMain.innerHTML = '<div class="empty-state" style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:48px 24px;color:rgba(22,31,56,0.6);border:1px dashed rgba(22,31,56,0.2);border-radius:14px;">No products match your filters right now. Try clearing a filter or widening your price range.</div>';
      return;
    }

    if (filters.category === 'all') {
      const grouped = {};
      products.forEach(p => {
        const cat = p.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
      });
      Object.entries(grouped).forEach(([cat, items]) => {
        marketMain.appendChild(buildCategoryRow(cat, items, formatPriceCurrency));
      });
    } else {
      marketMain.appendChild(buildProductGrid(products, formatPriceCurrency));
    }

    // Add "View all products" button
    const viewAllWrap = document.createElement('div');
    viewAllWrap.style.cssText = 'text-align:center;padding:8px 0 30px;';
    viewAllWrap.innerHTML = '<button id="viewAllBtn" style="padding:12px 28px;border-radius:999px;border:1px solid rgba(22,31,56,0.25);background:#fff;font-weight:700;cursor:pointer;">View all products</button>';
    marketMain.appendChild(viewAllWrap);
    const viewAllBtn = shadow.getElementById('viewAllBtn');
    if (viewAllBtn) viewAllBtn.addEventListener('click', () => navigate('/products'));

    // Set up scroll buttons for new cat-rows
    shadow.querySelectorAll('.scroll-btn').forEach(btn => {
      const handler = () => {
        const scroller = btn.parentElement && btn.parentElement.querySelector('.cat-scroll');
        const dir = parseInt(btn.dataset.scroll, 10);
        if (scroller && !Number.isNaN(dir)) scroller.scrollBy({ left: dir * 420, behavior: 'smooth' });
      };
      btn.addEventListener('click', handler);
    });

    // Set up auto-scroll for new cat-scroll elements
    const newIntervals = [];
    shadow.querySelectorAll('.cat-scroll').forEach(scroller => {
      const step = () => {
        const firstCard = scroller.querySelector('.product-card');
        if (!firstCard) return 0;
        return firstCard.offsetWidth + 16;
      };
      let direction = 1;
      const id = setInterval(() => {
        if (!scroller.isConnected) return;
        const s = step();
        if (!s) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        if (max <= 0) return;
        const next = scroller.scrollLeft + direction * s;
        if (direction === 1 && next >= max) {
          scroller.scrollTo({ left: max, behavior: 'smooth' });
          direction = -1;
        } else if (direction === -1 && next <= 0) {
          scroller.scrollTo({ left: 0, behavior: 'smooth' });
          direction = 1;
        } else {
          scroller.scrollBy({ left: direction * s, behavior: 'smooth' });
        }
      }, 3000);
      newIntervals.push(id);
    });

    return () => {
      newIntervals.forEach(clearInterval);
    };
  }, [shadowReady, products, loading, filters.category, navigate, formatPriceCurrency]);

  // Update filter sidebar categories from meta
  useEffect(() => {
    if (!shadowReady || !hostRef.current?.shadowRoot) return;
    const shadow = hostRef.current.shadowRoot;
    const dynCatContainer = shadow.getElementById('dynamicCategories');
    if (!dynCatContainer || !meta.categories || meta.categories.length === 0) return;

    dynCatContainer.innerHTML = '';
    meta.categories.forEach(cat => {
      const label = document.createElement('label');
      label.className = 'filter-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'f-category';
      checkbox.value = cat;
      const text = CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + text));
      dynCatContainer.appendChild(label);

      checkbox.addEventListener('change', (e) => {
        const allChecks = Array.from(shadow.querySelectorAll('.f-category'));
        if (e.target.checked) {
          allChecks.forEach(c => { if (c !== e.target) c.checked = false; });
          updateFilter('category', e.target.value);
        } else {
          updateFilter('category', 'all');
        }
      });
    });
  }, [shadowReady, meta, updateFilter]);

  if (loadingDesign || !html) return <PageLoadingSkeleton />;
  return (
    <>
      <Seo url="/" />
      <div ref={hostRef} className="w-full" />
      <ProductQuickView
        product={selectedProduct}
        isOpen={showQuickView}
        onClose={closeProductModal}
      />
    </>
  );
};

export default HomeRedesign;
