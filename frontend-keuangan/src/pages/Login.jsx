// File: src/pages/Login.jsx
// (File BARU - Halaman Gerbang Depan)

import React, { useContext } from 'react';
import { Form, Input, Button, Card, Typography, Row, Col } from 'antd'; // <-- Pastiin Row & Col di-import
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import AuthContext from '../context/AuthContext'; // Import "brankas" kita

const { Title } = Typography;

const Login = () => {
  // Ambil fungsi 'loginUser' dari "brankas"
  const { loginUser } = useContext(AuthContext);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    // Panggil fungsi login dari "brankas"
    await loginUser(values.username, values.password);
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <Col>
        <Card 
          style={{ width: 400, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}
          title={
            <Title level={3} style={{ textAlign: 'center', margin: 0, color: '#004445' }}>
              Login Sistem Akuntansi
            </Title>
          }
        >
          <Form
            form={form}
            name="login_form"
            onFinish={onFinish}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Mohon masukkan Username Anda!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Mohon masukkan Password Anda!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={false}>
                Log In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;