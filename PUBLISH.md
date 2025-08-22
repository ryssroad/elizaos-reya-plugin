# 📦 Инструкция по публикации в npm

## Шаг 1: Авторизация в npm

```bash
# Если у вас еще нет аккаунта npm, создайте его на https://www.npmjs.com/
npm login
```

Введите:
- Username
- Password  
- Email
- One-time password (если включен 2FA)

## Шаг 2: Проверка пакета

```bash
# Проверить содержимое пакета
npm pack --dry-run

# Проверить что build актуальный
npm run build
```

## Шаг 3: Публикация

```bash
# Опубликовать пакет (ВАЖНО: --access public для scoped packages)
npm publish --access public
```

## Шаг 4: Проверка

```bash
# Проверить что пакет опубликован
npm view elizaos-plugin-reya

# Проверить установку
npm install elizaos-plugin-reya --dry-run
```

## 🎯 После публикации

1. **В reyaz проекте** уже обновлена зависимость на `^0.1.0`
2. Выполните:
   ```bash
   cd ../reyaz
   npm install  # Установит пакет из npm вместо file:
   npm run build
   npm run start
   ```

## 🔄 Для обновлений пакета

```bash
# Обновить версию
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0  
npm version major  # 0.1.0 -> 1.0.0

# Опубликовать обновление
npm publish
```

## 📊 Статистика пакета

После публикации можно посмотреть:
- https://www.npmjs.com/package/elizaos-plugin-reya
- Скачивания, версии, зависимости

## ⚠️ Если возникли проблемы

### 403 Forbidden
```bash
# Проверить авторизацию
npm whoami

# Переавторизоваться
npm logout
npm login
```

### Имя пакета занято
```bash
# Изменить имя в package.json
"name": "@your-username/plugin-reya"
```

### Проблемы с scoped packages
```bash
# Убедитесь что используете --access public
npm publish --access public
```