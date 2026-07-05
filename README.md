# 拼豆库存管家

这是一个本地使用的第一版拼豆库存系统。打开 `index.html` 就能使用，资料会保存在浏览器的 LocalStorage 里。

## 第一版功能

- 记录色号、颜色名、颜色预览、剩余数量、低库存线
- CSV 批量导入 221 色库存
- 新建拼豆项目，输入图纸上的色号和所需数量
- 检查库存是否足够
- 确认后自动扣库存
- 查看低库存、缺货和历史记录
- 撤销最近一次项目扣库存
- 导出 / 导入 JSON 备份

## CSV 格式

可以先在系统里下载 CSV 模板。字段如下：

```csv
color_code,color_name,hex,current_qty,low_stock_threshold
A01,白色,#ffffff,1000,50
A02,黑色,#111111,1000,50
```

## 批量录入项目用量

每行一个色号和数量即可，逗号、空格、Tab 都可以：

```txt
A01 120
B15,43
C07	230
```

## 注意

目前第一版还没有 OCR。建议先把图纸上的色号和数量复制或手动录入，确认后再扣库存。

## Firebase 云同步

默认仍会保存到浏览器 LocalStorage。要在不同设备同步库存，可以启用 Firebase：

1. 在 Firebase Console 创建项目。
2. 开启 Authentication，并启用 Email/Password 登录方式。
3. 创建 Cloud Firestore 数据库。
4. 在项目设置里新增 Web App，把 Firebase config 复制到 `firebase-config.js`。
5. 使用以下 Firestore rules，确保每个用户只能读写自己的库存：

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/beadStock/state {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

第一次登录后，如果云端还没有资料，系统会自动把本机库存上传到云端。之后其他设备用同一个账号登录，就会读取同一份库存。
