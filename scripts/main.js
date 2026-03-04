/* ==========================================
   Webcraft — main.js
   Tabs + Accordion + Testimonials + Portfolio Filter + JSON Content
   (Stable / No layout breaks)
========================================== */

const CONTENT_PATH = './assets/content.json'
const CONTENT_VERSION = '1.0.0' // bump this only when you edit content.json

async function loadContentJSON() {
  try {
    const url = `${CONTENT_PATH}?v=${encodeURIComponent(CONTENT_VERSION)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status} while loading ${url}`)
    return await res.json()
  } catch (err) {
    console.warn('[content] JSON load error:', err)
    console.warn(
      '[content] Fix checklist:\n' +
        '1) Use Live Server (not file://)\n' +
        '2) Ensure assets/content.json exists\n' +
        '3) Confirm folder names match exactly (assets, scripts, styles)\n'
    )
    return null
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.tabs__btn')
  const pages = document.querySelectorAll('.page')
  const pageTitle = document.getElementById('pageTitle')
  const main = document.getElementById('main')

  const topbar = document.querySelector('.topbar')
  const navToggle = document.querySelector('.navToggle')

  function closeMobileMenu() {
    if (!topbar || !navToggle) return
    topbar.classList.remove('is-menu-open')
    navToggle.setAttribute('aria-expanded', 'false')
  }

  function toggleMobileMenu() {
    if (!topbar || !navToggle) return
    const isOpen = topbar.classList.toggle('is-menu-open')
    navToggle.setAttribute('aria-expanded', String(isOpen))
  }

  // Keep your toggle binding (unchanged behavior)
  if (navToggle) {
    navToggle.addEventListener('click', toggleMobileMenu)
  }

  // "click outside" + "Escape" should not depend on navToggle existence in the if-scope
  document.addEventListener('click', (e) => {
    if (!topbar || !navToggle) return
    const clickedInside = topbar.contains(e.target)
    if (!clickedInside) closeMobileMenu()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu()
  })

  const titles = {
    about: 'About Me',
    resume: 'Resume',
    portfolio: 'Portfolio',
    contact: 'Contact',
  }

  // bind keyboard navigation ONCE (not inside setActive)
  bindTabsA11yOnce(tabs, (pageKey) => setActive(pageKey))

  function setActive(pageKey) {
    tabs.forEach((btn) => {
      const isActive = btn.dataset.page === pageKey
      btn.classList.toggle('is-active', isActive)
      btn.setAttribute('aria-selected', String(isActive))
      btn.tabIndex = isActive ? 0 : -1
      closeMobileMenu()
    })

    pages.forEach((panel) => {
      const isActive = panel.dataset.page === pageKey
      panel.classList.toggle('is-active', isActive)
      panel.setAttribute('aria-hidden', String(!isActive))
    })

    if (pageTitle) pageTitle.textContent = titles[pageKey] || 'Page'
    if (main) main.scrollTop = 0

    if (pageKey === 'portfolio') {
      initPortfolioFiltering()
      logPortfolioCounts()
    }
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => setActive(btn.dataset.page))
  })

  const yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  const content = await loadContentJSON()

  if (content) {
    renderAbout(content)
    renderWhatImDoing(content)
    renderTestimonials(content)
    renderPortfolio(content)
    renderResume(content)
    renderContact(content)
  }

  bindAccordions()
  setActive('about')

  initTestimonialSlider()
  initPortfolioFiltering()
  logPortfolioCounts()
})

/* ==========================================
   Tabs keyboard navigation (a11y) — FIXED
   ArrowLeft/ArrowRight = move focus
   Enter/Space = activate
   Home/End = jump
   (Bound once to prevent duplicate listeners)
========================================== */
function bindTabsA11yOnce(tabsNodeList, onActivate) {
  const tabs = Array.from(tabsNodeList || [])
  if (!tabs.length) return

  // prevent double-bind if script re-runs
  if (document.documentElement.dataset.tabsA11yBound === 'true') return
  document.documentElement.dataset.tabsA11yBound = 'true'

  function focusTabByIndex(nextIndex) {
    if (!tabs.length) return
    const clamped = (nextIndex + tabs.length) % tabs.length
    tabs[clamped].focus()
  }

  tabs.forEach((btn, i) => {
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusTabByIndex(i + 1)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusTabByIndex(i - 1)
      }
      if (e.key === 'Home') {
        e.preventDefault()
        focusTabByIndex(0)
      }
      if (e.key === 'End') {
        e.preventDefault()
        focusTabByIndex(tabs.length - 1)
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const page = btn.dataset.page
        if (page) onActivate(page)
      }
    })
  })
}

/* ==========================================
   Render: About
========================================== */
function renderAbout(data) {
  if (!data?.about) return

  const lead = document.getElementById('aboutLead')
  const textWrap = document.getElementById('aboutTextWrap')
  const badgesWrap = document.getElementById('aboutBadges')
  const bulletsWrap = document.getElementById('aboutBullets')

  if (lead) lead.textContent = data.about.lead || ''

  if (textWrap && Array.isArray(data.about.paragraphs)) {
    textWrap.innerHTML = ''
    data.about.paragraphs.forEach((t) => {
      const p = document.createElement('p')
      p.className = 'section__text'
      p.textContent = t
      textWrap.appendChild(p)
    })
  }

  if (badgesWrap && Array.isArray(data.about.badges)) {
    badgesWrap.innerHTML = ''
    data.about.badges.forEach((b) => {
      const span = document.createElement('span')
      span.className = 'badge'
      span.textContent = b
      badgesWrap.appendChild(span)
    })
  }

  if (bulletsWrap && Array.isArray(data.about.bullets)) {
    bulletsWrap.innerHTML = ''
    data.about.bullets.forEach((liText) => {
      const li = document.createElement('li')
      li.textContent = liText
      bulletsWrap.appendChild(li)
    })
  }
}

/* ==========================================
   Render: What I'm Doing (Accordion Cards)
========================================== */
function renderWhatImDoing(data) {
  const wrap = document.getElementById('doingCards')
  if (!wrap || !Array.isArray(data?.whatImDoing)) return

  wrap.innerHTML = ''

  data.whatImDoing.forEach((item) => {
    const accId = `acc-${item.id}`

    const card = document.createElement('article')
    card.className = 'card card--expand'
    card.setAttribute('data-accordion', '')

    card.innerHTML = `
      <div class="card__head">
        <div class="card__copy">
          <h4 class="card__title">${escapeHTML(item.title || '')}</h4>
          <p class="card__text">${escapeHTML(item.desc || '')}</p>
        </div>

        <button class="card__toggle" type="button" aria-expanded="false" aria-controls="${accId}">
          <span class="card__toggleText">Includes</span>
          <span class="card__chev" aria-hidden="true">▾</span>
        </button>
      </div>

      <div class="card__more" id="${accId}" hidden>
        <div class="card__divider" aria-hidden="true"></div>
        <ul class="card__list">
          ${(item.includes || []).map((x) => `<li>${escapeHTML(x)}</li>`).join('')}
        </ul>
      </div>
    `
    wrap.appendChild(card)
  })
}

/* ==========================================
   Render: Testimonials
========================================== */
function renderTestimonials(data) {
  const track = document.getElementById('testimonialTrack')
  if (!track || !Array.isArray(data?.testimonials)) return

  track.innerHTML = ''

  data.testimonials.forEach((t) => {
    const item = document.createElement('article')
    item.className = 'titem'
    item.setAttribute('role', 'listitem')

    item.innerHTML = `
      <div class="tbox">
        <header class="tbox__head">
          <div class="tbox__avatar" aria-hidden="true">
            <img src="assets/images/avatar.svg" alt="" />
          </div>
          <div class="tbox__who">
            <p class="tbox__name">${escapeHTML(t.name || '')}</p>
            <p class="tbox__meta">${escapeHTML(t.meta || '')}</p>
          </div>
        </header>

        <p class="tbox__quote">${escapeHTML(t.quote || '')}</p>
      </div>
    `
    track.appendChild(item)
  })
}

/* ==========================================
   Render: Portfolio
========================================== */
function renderPortfolio(data) {
  const grid = document.getElementById('portfolioGrid')
  const lead = document.getElementById('portfolioLead')
  if (!grid || !data?.portfolio) return

  if (lead && data.portfolio.lead) lead.textContent = data.portfolio.lead

  const projects = Array.isArray(data.portfolio.projects) ? data.portfolio.projects : []
  grid.innerHTML = ''

  projects.forEach((p) => {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const tagsStr = tags.join(' ')

    const card = document.createElement('article')
    card.className = 'pitem'
    card.setAttribute('data-tags', tagsStr)

    const hasImage = Boolean((p.image || '').trim())
    const previewHTML = hasImage
      ? `
        <a class="ppreview" href="${escapeAttr(p.url || '#')}" target="_blank" rel="noopener">
          <img src="${escapeAttr(p.image || '')}" alt="${escapeAttr(
            p.alt || p.title || 'Portfolio preview'
          )}" loading="lazy" />
        </a>
      `
      : `
        <a class="ppreview" href="${escapeAttr(p.url || '#')}" target="_blank" rel="noopener">
          <div class="ppreview__placeholder" aria-hidden="true"></div>
        </a>
      `

    card.innerHTML = `
      ${previewHTML}
      <div class="pbody">
        <h3 class="ptitle">${escapeHTML(p.title || '')}</h3>
        <p class="psub">${escapeHTML(p.sub || '')}</p>
        <div class="ptags" aria-label="Tags"></div>
        <p class="pdesc">${escapeHTML(p.desc || '')}</p>
        <div class="pmeta">
          <p class="ptools"><strong>Tools:</strong> ${escapeHTML(p.tools || '')}</p>
          <a class="pbtn" href="${escapeAttr(p.url || '#')}" target="_blank" rel="noopener">
            ${escapeHTML(p.btn || 'View Site')}
          </a>
        </div>
      </div>
    `
    grid.appendChild(card)
  })
}

/* ==========================================
   Render: Resume (Fix timeline missing)
========================================== */
function renderResume(data) {
  const wrap = document.getElementById('resumeWrap')
  const r = data?.resume
  if (!wrap || !r) return

  const skillsCards = Array.isArray(r.skills) ? r.skills : []
  const work = Array.isArray(r.workExperience) ? r.workExperience : []
  const projects = Array.isArray(r.projectExperience) ? r.projectExperience : []
  const edu = Array.isArray(r.education) ? r.education : []

  // Main resume button and headline/core strengths section
  wrap.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h3 class="section__title">Resume Snapshot</h3>
        <a href="${escapeAttr(r.downloadUrl || '#')}" class="btn btn--primary" download target="_blank" rel="noopener">
          Download Resume
        </a>
      </div>

      <div class="rgrid">
        <article class="rcard">
          <h4 class="rcard__title">${escapeHTML(r.headline?.title || 'Headline')}</h4>
          <p class="rcard__text rcard__text--strong">${escapeHTML(r.headline?.strong || '')}</p>
          <p class="rcard__text">${escapeHTML(r.headline?.text || '')}</p>
        </article>

        <article class="rcard">
          <h4 class="rcard__title">${escapeHTML(r.coreStrengths?.title || 'Core Strengths')}</h4>
          <ul class="rlist">
            ${(r.coreStrengths?.items || []).map((x) => `<li>${escapeHTML(x)}</li>`).join('')}
          </ul>
        </article>
      </div>
    </section>

    <!-- Skills section with cards-->

    <section class="section">
      <h3 class="section__title">Technical Skills</h3>
      <div class="rskills">
        ${skillsCards
          .map(
            (s) => `
          <article class="rcard">
            <h4 class="rcard__title">${escapeHTML(s.title || '')}</h4>
            <ul class="rchips" aria-label="${escapeAttr(s.title || 'Skills')}">
              ${(s.items || []).map((i) => `<li class="rchips__item">${escapeHTML(i)}</li>`).join('')}
            </ul>
          </article>
        `
          )
          .join('')}
      </div>
    </section>

    <section class="section">
      <h3 class="section__title">Work Experience</h3>
      <ol class="timeline" aria-label="Work experience timeline">
        ${work.map((item) => renderTimelineItem(item)).join('')}
      </ol>
    </section>

    <section class="section">
      <h3 class="section__title">Project Experience</h3>
      <ol class="timeline" aria-label="Project experience timeline">
        ${projects.map((item) => renderTimelineItem(item)).join('')}
      </ol>
    </section>

    <section class="section">
      <h3 class="section__title">Education</h3>
      <ol class="timeline" aria-label="Education timeline">
        ${edu
          .map(
            (e) => `
          <li class="timeline__item">
            <div class="timeline__dot" aria-hidden="true"></div>
            <div class="timeline__content">
              <div class="timeline__head">
                <h4 class="timeline__title">${escapeHTML(e.title || '')}</h4>
                <time class="timeline__date" datetime="${escapeAttr(e.datetime || '')}">
                  ${escapeHTML(e.date || '')}
                </time>
              </div>
              <p class="timeline__desc">${escapeHTML(e.desc || '')}</p>
            </div>
          </li>
        `
          )
          .join('')}
      </ol>
    </section>
  `
}

// render timeline item with optional bullets (for work/project experience)
function renderTimelineItem(item) {
  const bullets = Array.isArray(item?.bullets) ? item.bullets : []
  return `
    <li class="timeline__item">
      <div class="timeline__dot" aria-hidden="true"></div>
      <div class="timeline__content">
        <div class="timeline__head">
          <h4 class="timeline__title">${escapeHTML(item?.title || '')}</h4>
          <time class="timeline__date" datetime="${escapeAttr(item?.datetime || '')}">
            ${escapeHTML(item?.date || '')}
          </time>
        </div>

        ${
          bullets.length
            ? `
          <ul class="bullets">
            ${bullets.map((b) => `<li class="bullets__item">${escapeHTML(b)}</li>`).join('')}
          </ul>
        `
            : ''
        }
      </div>
    </li>
  `
}

/* ==========================================
   Render: Contact
========================================== */
function renderContact(data) {
  const wrap = document.getElementById('contactWrap')
  const c = data?.contact
  if (!wrap || !c) return

  const opts = Array.isArray(c.form?.projectOptions) ? c.form.projectOptions : []

  wrap.innerHTML = `
    <section class="section">
      <h3 class="section__title">Contact</h3>
      <p class="section__text">${escapeHTML(c.lead || '')}</p>

      <div class="contact">
        <div class="contact__info">
          <div class="info-card">
            <h4 class="info-card__title">${escapeHTML(c.cardTitle || '')}</h4>
            <p class="info-card__text">${escapeHTML(c.cardText || '')}</p>

            <dl class="info-list">
              <div class="info-list__row">
                <dt class="info-list__label">Email</dt>
                <dd class="info-list__value">
                  <a class="link" href="mailto:${escapeAttr(c.details?.email || '')}">
                    ${escapeHTML(c.details?.email || '')}
                  </a>
                </dd>
              </div>

              <div class="info-list__row">
                <dt class="info-list__label">Location</dt>
                <dd class="info-list__value">${escapeHTML(c.details?.location || '')}</dd>
              </div>

              <div class="info-list__row">
                <dt class="info-list__label">Response time</dt>
                <dd class="info-list__value">${escapeHTML(c.details?.responseTime || '')}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="contact__form">
          <form
            class="form"
            action="mailto:reynaldtoledova@gmail.com"
            method="post"
            enctype="text/plain"
            novalidate
          >
            <div class="form__grid">
              <div class="form__row">
                <label class="form__label" for="name">Full name</label>
                <input class="form__control" id="name" name="name" type="text" autocomplete="name" />
              </div>

              <div class="form__row">
                <label class="form__label" for="email">Email</label>
                <input class="form__control" id="email" name="email" type="email" autocomplete="email" />
              </div>
            </div>

            <div class="form__row">
              <label class="form__label" for="subject">Project type</label>

              <!--Added wrapper + select class so your select CSS applies -->
              <div class="form__selectWrap">
                <select class="form__control form__control--select" id="subject" name="subject">
                  <option value="">Select one…</option>
                  ${opts
                    .map((o) => `<option value="${escapeAttr(o)}">${escapeHTML(o)}</option>`)
                    .join('')}
                </select>
              </div>
            </div>

            <div class="form__row">
              <label class="form__label" for="message">Message</label>
              <textarea
                class="form__control form__control--textarea"
                id="message"
                name="message"
                rows="6"
                placeholder="What do you need? Share links and goals if possible."
              ></textarea>
            </div>

            <div class="form__actions">
              <button class="btn btn--primary" type="submit">
                ${escapeHTML(c.form?.button || 'Send message')}
              </button>
              <p class="form__hint">${escapeHTML(c.form?.hint || '')}</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  `
}

/* ==========================================
   Accordion bind
========================================== */
function bindAccordions() {
  const accordionCards = document.querySelectorAll('[data-accordion]')
  accordionCards.forEach((card) => {
    const btn = card.querySelector('.card__toggle')
    const panel = card.querySelector('.card__more')
    const chev = card.querySelector('.card__chev')
    if (!btn || !panel) return

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true'
      btn.setAttribute('aria-expanded', String(!isOpen))
      panel.hidden = isOpen
      if (chev) chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)'
    })
  })
}

/* ==========================================
   Testimonials Slider (UNCHANGED)
========================================== */
function initTestimonialSlider() {
  const root = document.querySelector('[data-tslider]')
  if (!root) return

  const viewport = root.querySelector('.tslider__viewport')
  const track = root.querySelector('.tslider__track')
  const prevBtn = root.querySelector('.tslider__arrow--prev')
  const nextBtn = root.querySelector('.tslider__arrow--next')
  const dotsWrap = root.querySelector('.tslider__dots')

  if (!viewport || !track || !prevBtn || !nextBtn || !dotsWrap) return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const AUTOPLAY_MS = 2200
  const TRANSITION_MS = prefersReduced ? 0 : 420

  Array.from(track.children).forEach((el) => {
    if (el.dataset && el.dataset.clone === 'true') el.remove()
  })

  Array.from(track.querySelectorAll('.titem')).forEach((el) => {
    const name = el.querySelector('.tbox__name')?.textContent?.trim() || ''
    const quote = el.querySelector('.tbox__quote')?.textContent?.trim() || ''
    const isPlaceholder =
      name === '—' || name === '-' || quote.toLowerCase().includes('replace this')
    if (isPlaceholder) el.remove()
  })

  let originalSlides = Array.from(track.children).filter((el) => el.classList.contains('titem'))
  const total = originalSlides.length
  if (total < 2) return

  const CLONE_COUNT = Math.min(2, total)

  const headClones = originalSlides.slice(0, CLONE_COUNT).map((el) => {
    const c = el.cloneNode(true)
    c.dataset.clone = 'true'
    return c
  })

  const tailClones = originalSlides.slice(-CLONE_COUNT).map((el) => {
    const c = el.cloneNode(true)
    c.dataset.clone = 'true'
    return c
  })

  tailClones.reverse().forEach((c) => track.insertBefore(c, track.firstChild))
  headClones.forEach((c) => track.appendChild(c))

  let slides = Array.from(track.children).filter((el) => el.classList.contains('titem'))
  let index = CLONE_COUNT

  let isAnimating = false
  let timer = null
  let paused = false

  dotsWrap.innerHTML = ''
  const dots = []
  for (let i = 0; i < total; i++) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tslider__dot'
    b.setAttribute('aria-label', `Go to testimonial ${i + 1}`)
    b.addEventListener('click', () => goToReal(i))
    dotsWrap.appendChild(b)
    dots.push(b)
  }

  function setTransition(on) {
    track.style.transition = on && TRANSITION_MS ? `transform ${TRANSITION_MS}ms ease` : 'none'
  }

  function getTranslateX(el) {
    const st = window.getComputedStyle(el)
    const tr = st.transform || 'none'
    if (tr === 'none') return 0
    const m = tr.match(/matrix(3d)?\((.+)\)/)
    if (!m) return 0
    const vals = m[2].split(',').map((v) => parseFloat(v.trim()))
    return m[1] ? vals[12] || 0 : vals[4] || 0
  }

  function applyTransform(animate = true) {
    slides = Array.from(track.children).filter((el) => el.classList.contains('titem'))

    const isMobile = window.matchMedia('(max-width: 820px)').matches
    const centerIdx = isMobile ? index : index + 1
    const centerSlide = slides[centerIdx] || slides[index]
    if (!centerSlide) return

    const vRect = viewport.getBoundingClientRect()
    const cRect = centerSlide.getBoundingClientRect()

    const slideCenter = cRect.left - vRect.left + cRect.width / 2
    const viewportCenter = vRect.width / 2

    const current = getTranslateX(track)
    const delta = slideCenter - viewportCenter
    const nextX = current - delta

    setTransition(animate)
    track.style.transform = `translate3d(${nextX}px, 0, 0)`
  }

  function setCenterClass() {
    slides.forEach((s) => s.classList.remove('is-center'))
    const isMobile = window.matchMedia('(max-width: 820px)').matches
    const centerIdx = isMobile ? index : index + 1
    const centerSlide = slides[centerIdx] || slides[index]
    if (centerSlide) centerSlide.classList.add('is-center')
  }

  function setDots() {
    dots.forEach((d) => d.classList.remove('is-active'))

    const isMobile = window.matchMedia('(max-width: 820px)').matches
    const centerIdx = isMobile ? index : index + 1

    let realIndex = centerIdx - CLONE_COUNT
    realIndex = ((realIndex % total) + total) % total

    if (dots[realIndex]) dots[realIndex].classList.add('is-active')
  }

  function afterMove() {
    slides = Array.from(track.children).filter((el) => el.classList.contains('titem'))

    if (index >= CLONE_COUNT + total) {
      index = CLONE_COUNT
      setTransition(false)
      applyTransform(false)
    }

    if (index < CLONE_COUNT) {
      index = CLONE_COUNT + total - 1
      setTransition(false)
      applyTransform(false)
    }

    setCenterClass()
    setDots()
  }

  function lock() {
    isAnimating = true
    window.setTimeout(() => (isAnimating = false), TRANSITION_MS + 40)
  }

  function next() {
    if (isAnimating) return
    lock()
    index += 1
    applyTransform(true)
    window.setTimeout(afterMove, TRANSITION_MS)
  }

  function prev() {
    if (isAnimating) return
    lock()
    index -= 1
    applyTransform(true)
    window.setTimeout(afterMove, TRANSITION_MS)
  }

  function goToReal(realIdx) {
    if (isAnimating) return
    const isMobile = window.matchMedia('(max-width: 820px)').matches
    index = isMobile ? CLONE_COUNT + realIdx : CLONE_COUNT + realIdx - 1

    applyTransform(true)
    window.setTimeout(() => {
      setCenterClass()
      setDots()
    }, TRANSITION_MS)
  }

  function start() {
    if (prefersReduced) return
    stop()
    timer = window.setInterval(() => {
      if (paused) return
      next()
    }, AUTOPLAY_MS)
  }

  function stop() {
    if (timer) window.clearInterval(timer)
    timer = null
  }

  root.addEventListener('mouseenter', () => (paused = true))
  root.addEventListener('mouseleave', () => (paused = false))
  root.addEventListener('focusin', () => (paused = true))
  root.addEventListener('focusout', () => (paused = false))

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop()
    else start()
  })

  prevBtn.addEventListener('click', prev)
  nextBtn.addEventListener('click', next)

  let startX = 0
  let startY = 0
  let dragging = false

  viewport.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      dragging = true
    },
    { passive: true }
  )

  viewport.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging) return
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (Math.abs(dy) > Math.abs(dx)) return
      e.preventDefault()
    },
    { passive: false }
  )

  viewport.addEventListener(
    'touchend',
    (e) => {
      if (!dragging) return
      dragging = false
      const t = e.changedTouches[0]
      const dx = t.clientX - startX
      const THRESH = 40
      if (dx <= -THRESH) next()
      else if (dx >= THRESH) prev()
    },
    { passive: true }
  )

  window.addEventListener('resize', () => {
    setTransition(false)
    applyTransform(false)
    setCenterClass()
    setDots()
  })

  setTransition(false)
  track.style.transform = 'translate3d(0px, 0, 0)'
  applyTransform(false)
  setCenterClass()
  setDots()
  start()
}

/* ==========================================
   Portfolio Filtering (pills) — FIXED selector
========================================== */
function initPortfolioFiltering() {
  const panel = document.getElementById('panel-portfolio')
  if (!panel) return

  const nav = panel.querySelector('.pnav')
  const buttons = Array.from(panel.querySelectorAll('.pnav__btn[data-filter]'))

  // Fix: Try multiple selectors to find the grid, including global fallback
  const grid =
    panel.querySelector('#portfolioGrid') ||
    panel.querySelector('.portfolio-grid') ||
    document.getElementById('portfolioGrid')

  const items = grid ? Array.from(grid.querySelectorAll('.pitem[data-tags]')) : []

  if (!nav || !buttons.length || !grid || !items.length) return

  const normalize = (str) => (str || '').toLowerCase().trim()

  function buildPills() {
    items.forEach((item) => {
      const tagsWrap = item.querySelector('.ptags')
      if (!tagsWrap) return

      const tags = normalize(item.getAttribute('data-tags')).split(/\s+/).filter(Boolean)

      tagsWrap.innerHTML = ''
      tags.forEach((t) => {
        const pill = document.createElement('span')
        pill.className = 'ptag'
        pill.textContent = t.replace(/_/g, ' ')
        tagsWrap.appendChild(pill)
      })
    })
  }

  function setActive(filter) {
    const f = normalize(filter)
    buttons.forEach((b) => {
      const isActive = normalize(b.dataset.filter) === f
      b.classList.toggle('is-active', isActive)
      b.setAttribute('aria-selected', String(isActive))
    })
  }

  function applyFilter(filter) {
    const f = normalize(filter)
    setActive(f)

    items.forEach((item) => {
      const tags = normalize(item.getAttribute('data-tags')).split(/\s+/).filter(Boolean)
      const show = f === 'all' ? true : tags.includes(f)

      item.hidden = !show
      item.classList.toggle('is-hidden', !show)
    })
  }

  if (panel.dataset.portfolioBound !== 'true') {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.pnav__btn[data-filter]')
      if (!btn) return
      applyFilter(btn.dataset.filter)
      logPortfolioCounts()
    })
    panel.dataset.portfolioBound = 'true'
  }

  buildPills()
  applyFilter('all')
}

function logPortfolioCounts() {
  requestAnimationFrame(() => {
    const cards = document.querySelectorAll('#portfolioGrid .pitem').length
    const pills = document.querySelectorAll('#portfolioGrid .ptag').length
    console.log('portfolio cards:', cards)
    console.log('pills:', pills)
  })
}

/* ==========================================
   Helpers
========================================== */
function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttr(str) {
  return escapeHTML(str).replaceAll('`', '&#096;')
}
