// File: src/utils/PublicRoute.jsx
// (File BARU - "Satpam" Halaman Publik)

import React, { useContext } from 'react'; // <-- Pastikan import React
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext'; // Import "brankas" kita

const PublicRoute = () => {
  // Cek "brankas"
  let { user } = useContext(AuthContext);

  // Kalo ADA user (udah login), tendang ke Dashboard.
  // Kalo NGGAK ADA, izinin liat halaman Login/Register.
  return user ? <Navigate to="/" /> : <Outlet />;
};

export default PublicRoute;