import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    borderRadius: 8,
    fontFamily:
      "'Inter', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 24,
    fontSizeHeading2: 20,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    lineHeight: 1.5715,
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    paddingContentHorizontal: 24,
    paddingContentVertical: 24,
    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary:
      '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.06), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      bodyBg: '#f5f7fa',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      triggerBg: '#f5f7fa',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemHeight: 40,
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemActiveBg: '#e6f4ff',
      itemSelectedBg: '#e6f4ff',
      itemSelectedColor: '#1677ff',
      itemHoverBg: '#f5f7fa',
      iconSize: 16,
      collapsedIconSize: 16,
    },
    Card: {
      paddingLG: 24,
      borderRadiusLG: 16,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#6b7280',
      rowHoverBg: '#fafafa',
      borderColor: '#f0f0f0',
    },
    Tabs: {
      horizontalMargin: '0',
      horizontalItemPadding: '10px 0',
      horizontalItemGutter: 32,
    },
    Button: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
      controlHeightLG: 44,
    },
    Collapse: {
      headerBg: '#fafafa',
      contentBg: '#ffffff',
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
    Upload: {
      borderRadius: 16,
    },
    Progress: {
      defaultColor: '#1677ff',
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};

export default theme;
