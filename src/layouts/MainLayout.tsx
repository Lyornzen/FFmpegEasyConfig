import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import HeaderBar from '../components/HeaderBar';
import Sidebar from '../components/Sidebar';

const { Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <HeaderBar />
      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Sider
          width={240}
          collapsedWidth={64}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            overflow: 'auto',
            height: '100%',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <Sidebar />
        </Sider>
        <Content
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
