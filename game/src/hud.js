// Sunset Isles — Island Hopper: the HUD.
// Big white numbers on dark chips — they have to stay legible when the
// screenshot is shrunk to 480 px wide, so nothing here is small.

const $ = (id) => document.getElementById(id);
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function createHud() {
  const banner = $('banner');
  let bannerTimer = 0;

  return {
    update(s) {
      $('alt').textContent = Math.round(s.alt);
      $('spd').textContent = Math.round(s.spdKmh);
      const hdg = Math.round(s.heading);
      $('hdg').textContent = String(hdg).padStart(3, '0');
      $('hdgLetter').textContent = ' ' + COMPASS[Math.round(hdg / 45) % 8];
      $('compassHdg').textContent = String(hdg).padStart(3, '0') + '°';
      $('compassNext').textContent = s.nextLabel;
      $('missionName').textContent = s.missionName;
      $('missionObj').textContent = s.missionObj;
      $('missionTimer').textContent = s.timerText;
      $('scoreNum').textContent = s.score;
      $('fuelFill').style.width = Math.max(0, Math.min(100, s.fuel)) + '%';
      $('fuelFill').style.background = s.fuel < 25
        ? 'linear-gradient(90deg,#ef4444,#f59e0b)' : 'linear-gradient(90deg,#37d67a,#a5e635)';
      $('dmgFill').style.width = Math.max(0, Math.min(100, s.damage)) + '%';
      $('thrFill').style.width = Math.round(s.throttle * 100) + '%';
      // Speed lines at high speed: a bright vignette that fades in.
      $('vignette').style.opacity = s.spdKmh > 170 ? Math.min(0.9, (s.spdKmh - 170) / 90) : 0;
      if (bannerTimer > 0) {
        bannerTimer -= s.dt;
        if (bannerTimer <= 0) banner.style.display = 'none';
      }
    },
    showBanner(html, kind, seconds = 2.6) {
      banner.innerHTML = html;
      banner.className = kind;
      banner.style.display = 'block';
      bannerTimer = seconds;
    },
    hideBanner() {
      banner.style.display = 'none';
      bannerTimer = 0;
    },
    showMenu() { $('menu').style.display = 'flex'; },
    hideMenu() { $('menu').style.display = 'none'; },
  };
}
