import React, { useContext, useState, useEffect, useRef } from 'react';
import AuthContext from '../context/AuthContext';
import './Login.css';
import logoGambar from 'C:/Users/lenovo/.ssh/keuangan_akuntansi/frontend-keuangan/public/logo.png';

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  
  // State untuk form & UI
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusText, setStatusText] = useState('System Ready');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginError, setIsLoginError] = useState(false);

  // Refs untuk tracking state animasi tanpa re-render berlebih
  const stateRefs = useRef({
    mouseX: 0,
    mouseY: 0,
    isTyping: false,
    isLookingAtEachOther: false,
    isPurpleBlinking: false,
    isBlackBlinking: false,
    isPurplePeeking: false,
    isPasswordFocused: false,
    showPassword: false,
    isLoginError: false
  });

  // Sync state ke Ref
  useEffect(() => {
    stateRefs.current.showPassword = showPassword;
    stateRefs.current.isLoginError = isLoginError;
  }, [showPassword, isLoginError]);

  // Logika Animasi Karakter
  useEffect(() => {
    const refs = stateRefs.current;
    let typingTimer = null;
    let errorRecoverTimer = null;

    const calcPosition = (el) => {
      if (!el) return { faceX: 0, faceY: 0, bodySkew: 0 };
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 3;
      const dx = refs.mouseX - cx;
      const dy = refs.mouseY - cy;
      const faceX = Math.max(-15, Math.min(15, dx / 20));
      const faceY = Math.max(-10, Math.min(10, dy / 30));
      const bodySkew = Math.max(-6, Math.min(6, -dx / 120));
      return { faceX, faceY, bodySkew };
    };

    const calcPupilOffset = (el, maxDist) => {
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = refs.mouseX - cx;
      const dy = refs.mouseY - cy;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    };

    const updateCharacters = () => {
      const purple = document.getElementById('char-purple');
      const black = document.getElementById('char-black');
      const orange = document.getElementById('char-orange');
      const yellow = document.getElementById('char-yellow');

      if (!purple || !black || !orange || !yellow) return;

      const purplePos = calcPosition(purple);
      const blackPos = calcPosition(black);
      const orangePos = calcPosition(orange);
      const yellowPos = calcPosition(yellow);

      const pwdElement = document.getElementById('password');
      const pwdLen = pwdElement ? pwdElement.value.length : 0;
      const isShowingPwd = pwdLen > 0 && refs.showPassword;
      const isLookingAway = refs.isPasswordFocused && !refs.showPassword;

      // ---- Purple body ----
      if (isShowingPwd) {
        purple.style.transform = 'skewX(0deg)';
        purple.style.height = '370px';
      } else if (isLookingAway) {
        purple.style.transform = 'skewX(-14deg) translateX(-20px)';
        purple.style.height = '410px';
      } else if (refs.isTyping) {
        purple.style.transform = `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`;
        purple.style.height = '410px';
      } else {
        purple.style.transform = `skewX(${purplePos.bodySkew}deg)`;
        purple.style.height = '370px';
      }

      // Purple eyes
      const purpleEyes = document.getElementById('purple-eyes');
      const purpleEyeL = document.getElementById('purple-eye-l');
      const purpleEyeR = document.getElementById('purple-eye-r');
      const purplePupilL = document.getElementById('purple-pupil-l');
      const purplePupilR = document.getElementById('purple-pupil-r');

      purpleEyeL.style.height = refs.isPurpleBlinking ? '2px' : '18px';
      purpleEyeR.style.height = refs.isPurpleBlinking ? '2px' : '18px';

      if (refs.isLoginError) {
        purpleEyes.style.left = '30px';
        purpleEyes.style.top = '55px';
        purplePupilL.style.transform = 'translate(-3px, 4px)';
        purplePupilR.style.transform = 'translate(-3px, 4px)';
      } else if (isLookingAway) {
        purpleEyes.style.left = '20px';
        purpleEyes.style.top = '25px';
        purplePupilL.style.transform = 'translate(-5px, -5px)';
        purplePupilR.style.transform = 'translate(-5px, -5px)';
      } else if (isShowingPwd) {
        purpleEyes.style.left = '20px';
        purpleEyes.style.top = '35px';
        const px = refs.isPurplePeeking ? 4 : -4;
        const py = refs.isPurplePeeking ? 5 : -4;
        purplePupilL.style.transform = `translate(${px}px, ${py}px)`;
        purplePupilR.style.transform = `translate(${px}px, ${py}px)`;
      } else if (refs.isLookingAtEachOther) {
        purpleEyes.style.left = '55px';
        purpleEyes.style.top = '65px';
        purplePupilL.style.transform = 'translate(3px, 4px)';
        purplePupilR.style.transform = 'translate(3px, 4px)';
      } else {
        purpleEyes.style.left = (45 + purplePos.faceX) + 'px';
        purpleEyes.style.top = (40 + purplePos.faceY) + 'px';
        const po = calcPupilOffset(purpleEyeL, 5);
        purplePupilL.style.transform = `translate(${po.x}px, ${po.y}px)`;
        purplePupilR.style.transform = `translate(${po.x}px, ${po.y}px)`;
      }

      // ---- Black body ----
      if (isShowingPwd) {
        black.style.transform = 'skewX(0deg)';
      } else if (isLookingAway) {
        black.style.transform = 'skewX(12deg) translateX(-10px)';
      } else if (refs.isLookingAtEachOther) {
        black.style.transform = `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`;
      } else if (refs.isTyping) {
        black.style.transform = `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`;
      } else {
        black.style.transform = `skewX(${blackPos.bodySkew}deg)`;
      }

      const blackEyes = document.getElementById('black-eyes');
      const blackEyeL = document.getElementById('black-eye-l');
      const blackEyeR = document.getElementById('black-eye-r');
      const blackPupilL = document.getElementById('black-pupil-l');
      const blackPupilR = document.getElementById('black-pupil-r');

      blackEyeL.style.height = refs.isBlackBlinking ? '2px' : '16px';
      blackEyeR.style.height = refs.isBlackBlinking ? '2px' : '16px';

      if (refs.isLoginError) {
        blackEyes.style.left = '15px';
        blackEyes.style.top = '40px';
        blackPupilL.style.transform = 'translate(-3px, 4px)';
        blackPupilR.style.transform = 'translate(-3px, 4px)';
      } else if (isLookingAway) {
        blackEyes.style.left = '10px';
        blackEyes.style.top = '20px';
        blackPupilL.style.transform = 'translate(-4px, -5px)';
        blackPupilR.style.transform = 'translate(-4px, -5px)';
      } else if (isShowingPwd) {
        blackEyes.style.left = '10px';
        blackEyes.style.top = '28px';
        blackPupilL.style.transform = 'translate(-4px, -4px)';
        blackPupilR.style.transform = 'translate(-4px, -4px)';
      } else if (refs.isLookingAtEachOther) {
        blackEyes.style.left = '32px';
        blackEyes.style.top = '12px';
        blackPupilL.style.transform = 'translate(0px, -4px)';
        blackPupilR.style.transform = 'translate(0px, -4px)';
      } else {
        blackEyes.style.left = (26 + blackPos.faceX) + 'px';
        blackEyes.style.top = (32 + blackPos.faceY) + 'px';
        const bo = calcPupilOffset(blackEyeL, 4);
        blackPupilL.style.transform = `translate(${bo.x}px, ${bo.y}px)`;
        blackPupilR.style.transform = `translate(${bo.x}px, ${bo.y}px)`;
      }

      // ---- Orange body & eyes ----
      const orangeMouth = document.getElementById('orange-mouth');
      if (refs.isLoginError) {
        orangeMouth.style.left = (80 + orangePos.faceX) + 'px';
        orangeMouth.style.top = '130px';
      }
      if (isShowingPwd) {
        orange.style.transform = 'skewX(0deg)';
      } else {
        orange.style.transform = `skewX(${orangePos.bodySkew}deg)`;
      }

      const orangeEyes = document.getElementById('orange-eyes');
      const orangePupilL = document.getElementById('orange-pupil-l');
      const orangePupilR = document.getElementById('orange-pupil-r');

      if (refs.isLoginError) {
        orangeEyes.style.left = '60px';
        orangeEyes.style.top = '95px';
        orangePupilL.style.transform = 'translate(-3px, 4px)';
        orangePupilR.style.transform = 'translate(-3px, 4px)';
      } else if (isLookingAway) {
        orangeEyes.style.left = '50px';
        orangeEyes.style.top = '75px';
        orangePupilL.style.transform = 'translate(-5px, -5px)';
        orangePupilR.style.transform = 'translate(-5px, -5px)';
      } else if (isShowingPwd) {
        orangeEyes.style.left = '50px';
        orangeEyes.style.top = '85px';
        orangePupilL.style.transform = 'translate(-5px, -4px)';
        orangePupilR.style.transform = 'translate(-5px, -4px)';
      } else {
        orangeEyes.style.left = (82 + orangePos.faceX) + 'px';
        orangeEyes.style.top = (90 + orangePos.faceY) + 'px';
        const oo = calcPupilOffset(orangePupilL, 5);
        orangePupilL.style.transform = `translate(${oo.x}px, ${oo.y}px)`;
        orangePupilR.style.transform = `translate(${oo.x}px, ${oo.y}px)`;
      }

      // ---- Yellow body & eyes ----
      if (isShowingPwd) {
        yellow.style.transform = 'skewX(0deg)';
      } else {
        yellow.style.transform = `skewX(${yellowPos.bodySkew}deg)`;
      }

      const yellowEyes = document.getElementById('yellow-eyes');
      const yellowPupilL = document.getElementById('yellow-pupil-l');
      const yellowPupilR = document.getElementById('yellow-pupil-r');
      const yellowMouth = document.getElementById('yellow-mouth');

      if (refs.isLoginError) {
        yellowEyes.style.left = '35px';
        yellowEyes.style.top = '45px';
        yellowPupilL.style.transform = 'translate(-3px, 4px)';
        yellowPupilR.style.transform = 'translate(-3px, 4px)';
        yellowMouth.style.left = '30px';
        yellowMouth.style.top = '92px';
        yellowMouth.style.transform = 'rotate(-8deg)';
      } else if (isLookingAway) {
        yellowEyes.style.left = '20px';
        yellowEyes.style.top = '30px';
        yellowPupilL.style.transform = 'translate(-5px, -5px)';
        yellowPupilR.style.transform = 'translate(-5px, -5px)';
        yellowMouth.style.left = '15px';
        yellowMouth.style.top = '78px';
        yellowMouth.style.transform = 'rotate(0deg)';
      } else if (isShowingPwd) {
        yellowEyes.style.left = '20px';
        yellowEyes.style.top = '35px';
        yellowPupilL.style.transform = 'translate(-5px, -4px)';
        yellowPupilR.style.transform = 'translate(-5px, -4px)';
        yellowMouth.style.left = '10px';
        yellowMouth.style.top = '88px';
        yellowMouth.style.transform = 'rotate(0deg)';
      } else {
        yellowEyes.style.left = (52 + yellowPos.faceX) + 'px';
        yellowEyes.style.top = (40 + yellowPos.faceY) + 'px';
        const yo = calcPupilOffset(yellowPupilL, 5);
        yellowPupilL.style.transform = `translate(${yo.x}px, ${yo.y}px)`;
        yellowPupilR.style.transform = `translate(${yo.x}px, ${yo.y}px)`;
        yellowMouth.style.left = (40 + yellowPos.faceX) + 'px';
        yellowMouth.style.top = (88 + yellowPos.faceY) + 'px';
        yellowMouth.style.transform = 'rotate(0deg)';
      }
    };

    const handleMouseMove = (e) => {
      refs.mouseX = e.clientX;
      refs.mouseY = e.clientY;
      if (!refs.isTyping && !refs.isLoginError) updateCharacters();
    };

    const handleFocusUsername = () => {
      refs.isTyping = true;
      refs.isLookingAtEachOther = true;
      updateCharacters();
    };

    const handleBlurUsername = () => {
      refs.isTyping = false;
      refs.isLookingAtEachOther = false;
      updateCharacters();
    };

    const handleInputUsername = () => {
      refs.isLookingAtEachOther = true;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        refs.isLookingAtEachOther = false;
        updateCharacters();
      }, 800);
      updateCharacters();
    };

    const handleFocusPassword = () => {
      refs.isPasswordFocused = true;
      updateCharacters();
    };

    const handleBlurPassword = () => {
      refs.isPasswordFocused = false;
      updateCharacters();
    };

    document.addEventListener('mousemove', handleMouseMove);
    const userInput = document.getElementById('username');
    const pwdInput = document.getElementById('password');

    if (userInput) {
      userInput.addEventListener('focus', handleFocusUsername);
      userInput.addEventListener('blur', handleBlurUsername);
      userInput.addEventListener('input', handleInputUsername);
    }
    if (pwdInput) {
      pwdInput.addEventListener('focus', handleFocusPassword);
      pwdInput.addEventListener('blur', handleBlurPassword);
      pwdInput.addEventListener('input', updateCharacters);
    }

    const blinkIntervals = [];
    const scheduleBlinkPurple = () => {
      blinkIntervals.push(setTimeout(() => {
        refs.isPurpleBlinking = true;
        updateCharacters();
        blinkIntervals.push(setTimeout(() => {
          refs.isPurpleBlinking = false;
          updateCharacters();
          scheduleBlinkPurple();
        }, 150));
      }, Math.random() * 4000 + 3000));
    };

    const scheduleBlinkBlack = () => {
      blinkIntervals.push(setTimeout(() => {
        refs.isBlackBlinking = true;
        updateCharacters();
        blinkIntervals.push(setTimeout(() => {
          refs.isBlackBlinking = false;
          updateCharacters();
          scheduleBlinkBlack();
        }, 150));
      }, Math.random() * 4000 + 3000));
    };

    scheduleBlinkPurple();
    scheduleBlinkBlack();
    updateCharacters();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (userInput) {
        userInput.removeEventListener('focus', handleFocusUsername);
        userInput.removeEventListener('blur', handleBlurUsername);
        userInput.removeEventListener('input', handleInputUsername);
      }
      if (pwdInput) {
        pwdInput.removeEventListener('focus', handleFocusPassword);
        pwdInput.removeEventListener('blur', handleBlurPassword);
        pwdInput.removeEventListener('input', updateCharacters);
      }
      blinkIntervals.forEach(clearTimeout);
      clearTimeout(typingTimer);
      clearTimeout(errorRecoverTimer);
    };
  }, []);

  const triggerErrorAnimation = (message) => {
    setErrorMsg(message);
    setIsLoginError(true);
    
    const shakeIds = ['purple-eyes', 'black-eyes', 'orange-eyes', 'yellow-eyes', 'yellow-mouth', 'orange-mouth'];
    const shakeEls = shakeIds.map(id => document.getElementById(id));
    
    void document.body.offsetHeight; // Force reflow
    
    const orangeMouth = document.getElementById('orange-mouth');
    if (orangeMouth) orangeMouth.classList.add('visible');

    setTimeout(() => {
      shakeEls.forEach(el => {
        if (el) el.classList.add('shake-head');
      });
    }, 350);

    setTimeout(() => {
      setIsLoginError(false);
      if (orangeMouth) orangeMouth.classList.remove('visible');
      shakeEls.forEach(el => {
        if (el) el.classList.remove('shake-head');
      });
    }, 2500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatusText('Authenticating...');
    setErrorMsg('');
    setIsLoading(true);
    setIsLoginError(false);

    // Hapus sisa animasi error (reset)
    const shakeIds = ['purple-eyes', 'black-eyes', 'orange-eyes', 'yellow-eyes', 'yellow-mouth', 'orange-mouth'];
    shakeIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('shake-head');
    });
    const orangeMouth = document.getElementById('orange-mouth');
    if (orangeMouth) orangeMouth.classList.remove('visible');

    try {
      await loginUser(username, password);
      setStatusText('Access Granted');
      setIsLoading(false);
    } catch (error) {
      setStatusText('Access Denied');
      setIsLoading(false);
      triggerErrorAnimation('Invalid username or password. Please try again.');
      setTimeout(() => {
        setStatusText('System Ready');
      }, 2000);
    }
  };

  return (
    <div id="login-page">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="logo">
          <img src={logoGambar} alt="Logo" className="custom-logo" />
          <span>ARTO SUKSES</span>
        </div>
        <div className="characters-wrapper">
          <div className="characters-scene" id="characters-scene">
            {/* Karakter ungu, hitam, orange, kuning (Sama seperti sebelumnya) */}
            <div className="character char-purple" id="char-purple">
              <div className="eyes" id="purple-eyes" style={{ left: '45px', top: '40px', gap: '28px' }}>
                <div className="eyeball" id="purple-eye-l" style={{ width: '18px', height: '18px' }}><div className="pupil" id="purple-pupil-l" style={{ width: '7px', height: '7px' }}></div></div>
                <div className="eyeball" id="purple-eye-r" style={{ width: '18px', height: '18px' }}><div className="pupil" id="purple-pupil-r" style={{ width: '7px', height: '7px' }}></div></div>
              </div>
            </div>
            <div className="character char-black" id="char-black">
              <div className="eyes" id="black-eyes" style={{ left: '26px', top: '32px', gap: '20px' }}>
                <div className="eyeball" id="black-eye-l" style={{ width: '16px', height: '16px' }}><div className="pupil" id="black-pupil-l" style={{ width: '6px', height: '6px' }}></div></div>
                <div className="eyeball" id="black-eye-r" style={{ width: '16px', height: '16px' }}><div className="pupil" id="black-pupil-r" style={{ width: '6px', height: '6px' }}></div></div>
              </div>
            </div>
            <div className="character char-orange" id="char-orange">
              <div className="eyes" id="orange-eyes" style={{ left: '82px', top: '90px', gap: '28px' }}>
                <div className="bare-pupil" id="orange-pupil-l"></div>
                <div className="bare-pupil" id="orange-pupil-r"></div>
              </div>
              <div className="orange-mouth" id="orange-mouth" style={{ left: '90px', top: '120px' }}></div>
            </div>
            <div className="character char-yellow" id="char-yellow">
              <div className="eyes" id="yellow-eyes" style={{ left: '52px', top: '40px', gap: '20px' }}>
                <div className="bare-pupil" id="yellow-pupil-l"></div>
                <div className="bare-pupil" id="yellow-pupil-r"></div>
              </div>
              <div className="yellow-mouth" id="yellow-mouth" style={{ left: '40px', top: '88px' }}></div>
            </div>
          </div>
        </div>
        <div className="footer-links" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
          <p>© 2025 PT. ARTO SUKSES SELADA AGREE KALCER JAYA ABADI</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="form-container">
          <div className="sparkle-icon">
            <i className="fa-solid fa-server" style={{ fontSize: '32px', color: '#1a1a2e' }}></i>
          </div>
          <div className="form-header">
            <h1>EQUILIB SYSTEM BY ATMAJA</h1>
            <p style={{ color: statusText === 'Access Denied' ? '#dc2626' : (statusText === 'Access Granted' ? '#10b981' : '#888'), fontWeight: '500' }}>
              {statusText}
            </p>
          </div>

          <form id="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label id="username-label" htmlFor="username" className={isLoginError && !username ? 'error-label' : ''}>User Identification</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="username"
                  placeholder="Enter username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={isLoginError && !username ? 'error' : ''}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label id="password-label" htmlFor="password" className={isLoginError && !password ? 'error-label' : ''}>Security Code</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={isLoginError && !password ? 'error' : ''}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  id="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg id="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: showPassword ? 'none' : 'block' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg id="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: showPassword ? 'block' : 'none' }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="error-msg" id="error-msg" style={{ display: 'block' }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn-login" id="btn-login" disabled={isLoading}>
              <span className="btn-text">{isLoading ? 'Authenticating...' : 'Login'}</span>
              <div className="btn-hover-content">
                <span>{isLoading ? 'Authenticating...' : 'Login'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </div>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;