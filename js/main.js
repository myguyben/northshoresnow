/* ============================================
   NORTH SHORE SNOW - MAIN JS
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {

  // --- Header Scroll Effect ---
  const header = document.querySelector('.header');
  if (header) {
    window.addEventListener('scroll', function() {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // --- Mobile Menu Toggle ---
  const mobileToggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.nav');

  function closeMenu() {
    if (!nav || !mobileToggle) return;
    nav.classList.remove('active');
    document.querySelectorAll('.nav-item.open').forEach(function(item) {
      item.classList.remove('open');
    });
    const spans = mobileToggle.querySelectorAll('span');
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }

  if (mobileToggle && nav) {
    mobileToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
      const spans = mobileToggle.querySelectorAll('span');
      if (nav.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        closeMenu();
      }
    });

    // Close menu when clicking a non-dropdown nav link
    nav.querySelectorAll('.nav-link').forEach(function(link) {
      var item = link.closest('.nav-item');
      if (!item || !item.querySelector('.dropdown')) {
        link.addEventListener('click', function() { closeMenu(); });
      }
    });
    nav.querySelectorAll('.dropdown-link').forEach(function(link) {
      link.addEventListener('click', function() { closeMenu(); });
    });

    // Close menu on outside click
    document.addEventListener('click', function(e) {
      if (nav.classList.contains('active') && !nav.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMenu();
      }
    });
  }

  // --- Mobile Dropdown Toggle ---
  document.querySelectorAll('.nav-item').forEach(function(item) {
    const link = item.querySelector('.nav-link');
    const dropdown = item.querySelector('.dropdown');
    if (link && dropdown) {
      link.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 || (nav && nav.classList.contains('active'))) {
          e.preventDefault();
          document.querySelectorAll('.nav-item.open').forEach(function(other) {
            if (other !== item) other.classList.remove('open');
          });
          item.classList.toggle('open');
        }
      });
    }
  });

  // --- Tabs ---
  document.querySelectorAll('.tabs').forEach(function(tabsContainer) {
    const buttons = tabsContainer.querySelectorAll('.tab-btn');
    const parent = tabsContainer.parentElement;
    const contents = parent.querySelectorAll('.tab-content');

    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('active'); });
        contents.forEach(function(c) { c.classList.remove('active'); });
        btn.classList.add('active');
        var target = parent.querySelector('#' + btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  });

  // --- FAQ Accordion ---
  document.querySelectorAll('.faq-question').forEach(function(question) {
    question.addEventListener('click', function() {
      var item = this.closest('.faq-item');
      var isActive = item.classList.contains('active');
      // Close all
      document.querySelectorAll('.faq-item').forEach(function(faq) {
        faq.classList.remove('active');
      });
      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // --- Slider ---
  document.querySelectorAll('.slider-container').forEach(function(slider) {
    var track = slider.querySelector('.slider-track');
    var slides = slider.querySelectorAll('.slider-slide');
    var prevBtn = slider.querySelector('.slider-prev');
    var nextBtn = slider.querySelector('.slider-next');
    var current = 0;
    var total = slides.length;

    function goToSlide(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      current = index;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
    }

    if (prevBtn) prevBtn.addEventListener('click', function() { goToSlide(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { goToSlide(current + 1); });

    // Auto-play
    if (total > 1) {
      setInterval(function() { goToSlide(current + 1); }, 5000);
    }
  });

  // --- Toggle Switch (Contact Form) ---
  var toggleSwitch = document.querySelector('.toggle-switch');
  var toggleLabels = document.querySelectorAll('.toggle-label');
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', function() {
      toggleSwitch.classList.toggle('active');
      toggleLabels.forEach(function(label) {
        label.classList.toggle('active');
      });
    });
  }

  // --- Contact Form Handling (websol.ca backend) ---
  var contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var form = contactForm;
      var submitBtn = form.querySelector('button[type="submit"]');
      var successMsg = document.querySelector('.form-success');

      // Gather fields (flexible - works with various form layouts)
      var nameField = form.querySelector('[name="name"], [name="firstName"]');
      var lastField = form.querySelector('[name="lastName"]');
      var emailField = form.querySelector('[name="email"]');
      var phoneField = form.querySelector('[name="phone"]');
      var messageField = form.querySelector('[name="message"], [name="details"], textarea');

      var fullName = nameField ? nameField.value.trim() : '';
      if (lastField && lastField.value.trim()) fullName += ' ' + lastField.value.trim();

      if (!fullName || !emailField || !emailField.value.trim()) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

      fetch('https://websol-backend.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: 'northshoresnow',
          name: fullName,
          email: emailField.value.trim(),
          phone: phoneField ? phoneField.value.trim() || null : null,
          message: messageField ? messageField.value.trim() || 'Quote request' : 'Quote request'
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && successMsg) {
          successMsg.style.display = 'block';
          form.style.display = 'none';
        } else {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
          alert('Something went wrong. Please call us at (604) 990-7072.');
        }
      })
      .catch(function() {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
        alert('Network error. Please call us at (604) 990-7072.');
      });
    });
  }

  // --- Animate on Scroll ---
  var animateElements = document.querySelectorAll('.animate-on-scroll');
  if (animateElements.length > 0) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    animateElements.forEach(function(el) {
      observer.observe(el);
    });
  }

  // --- Smooth Scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Counter Animation ---
  function animateCounter(el) {
    var target = parseInt(el.dataset.target || el.textContent);
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var duration = 2000;
    var start = 0;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = Math.floor(progress * target);
      el.textContent = prefix + value + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('.stat-number[data-target]');
  if (counters.length > 0) {
    var counterObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function(counter) {
      counterObserver.observe(counter);
    });
  }

});
