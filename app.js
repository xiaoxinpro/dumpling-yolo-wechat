// app.js
App({
  globalData: {
    config: null,
  },

  onLaunch() {
    this.loadConfig(); // 加载配置文件
  },

  loadConfig() {
    try {
      // 尝试加载 config.js
      const config = require('./config.js');
      this.globalData.config = config; // 加载成功，赋值到 globalData
      console.log('配置文件加载成功:', config);
    } catch (error) {
      console.error('配置文件加载失败:', error);

      // 提示用户
      wx.showModal({
        title: '配置文件缺失',
        content: '请将 config.template.js 重命名为 config.js 并填写配置信息。',
        showCancel: false,
        confirmText: '知道了',
        success(res) {
          if (res.confirm) {
            console.log('用户已确认');
          }
        },
      });
    }
  },
});
