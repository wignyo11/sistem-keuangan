import React, { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import './Login.css'; // Pastikan file CSS ini dibuat sebaris atau di folder yang sama

const Login = () => {
    const { loginUser } = useContext(AuthContext);
    
    // State untuk form & UI
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [statusText, setStatusText] = useState('System Ready');

    // Animasi Grid & Shapes (di-generate sekali saat komponen dimuat)
    const [gridLines, setGridLines] = useState([]);
    const [shapes, setShapes] = useState([]);

    useEffect(() => {
        // Generate Horizontal Lines
        const hLines = Array.from({ length: 30 }).map((_, i) => ({
            type: 'h', top: `${i * 50}px`, delay: `${i * 0.1}s`
        }));
        // Generate Vertical Lines
        const vLines = Array.from({ length: 40 }).map((_, i) => ({
            type: 'v', left: `${i * 50}px`, delay: `${i * 0.1 + 0.5}s`
        }));
        setGridLines([...hLines, ...vLines]);

        // Generate Shapes
        const newShapes = Array.from({ length: 5 }).map((_, i) => ({
            size: Math.random() * 200 + 100,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            delay: `${i * 1.6}s`,
            duration: `${Math.random() * 4 + 6}s`
        }));
        setShapes(newShapes);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setStatusText('Authenticating...');
        
        try {
            // Panggil fungsi dari backend Django kita
            await loginUser( username, password ); // Sesuaikan parameter kalau loginUser butuh objek atau 2 argumen terpisah
            setStatusText('Access Granted');
        } catch (error) {
            setStatusText('Access Denied');
            setTimeout(() => {
                setStatusText('System Ready');
            }, 2000);
        }
    };

    return (
        <div className="futuristic-body">
            {/* Background Grid Animations */}
            <div className="grid-container">
                {gridLines.map((line, idx) => (
                    <div key={`line-${idx}`} className="grid-line" style={{
                        width: line.type === 'h' ? '100%' : '1px',
                        height: line.type === 'h' ? '1px' : '100%',
                        top: line.top || 'auto',
                        left: line.left || 'auto',
                        animationDelay: line.delay
                    }}></div>
                ))}
                {shapes.map((shape, idx) => (
                    <div key={`shape-${idx}`} className="shape" style={{
                        width: `${shape.size}px`,
                        height: `${shape.size}px`,
                        left: shape.left,
                        top: shape.top,
                        animationDelay: shape.delay,
                        animationDuration: shape.duration
                    }}></div>
                ))}
            </div>

            {/* Login Box */}
            <div className="login-container">
                <div className="corner-decoration top-left"></div>
                <div className="corner-decoration top-right"></div>
                <div className="corner-decoration bottom-left"></div>
                <div className="corner-decoration bottom-right"></div>

                <div className="header">
                    <div className="scan-line"></div>
                    <h1>EQUILIB SYSTEM</h1>
                    <p className="status-text">{statusText}</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">User Identification</label>
                        <div className="input-wrapper">
                            <i className="fa-solid fa-user field-icon"></i>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Enter username" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Security Code</label>
                        <div className="input-wrapper">
                            <i className="fa-solid fa-lock field-icon"></i>
                            <input 
                                type={isPasswordVisible ? "text" : "password"} 
                                className="input-field" 
                                placeholder="Enter password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                            <i 
                                className={`fa-solid toggle-icon ${isPasswordVisible ? 'fa-eye-slash' : 'fa-eye'}`} 
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            ></i>
                        </div>
                    </div>

                    <button type="submit" className="submit-btn">
                        Login
                    </button>
                </form>

                <div className="footer-credit">
                    <p>PT. ARTO SUKSES SELADA AGREE KALCER JAYA ABADI</p>
                </div>
            </div>
        </div>
    );
};

export default Login;