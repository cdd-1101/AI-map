# Google Maps 挑点页面实现方案

## 技术选型

| 层面 | 技术 | 原因 |
|------|------|------|
| 框架 | React 18 + Vite + TypeScript | 用户选定 |
| 地图库 | `@react-google-maps/api` | 成熟的 React 封装，支持 OverlayView 自定义渲染 |
| 搜索 | Google Places Autocomplete API | 官方模糊匹配，支持越南全境 |
| 样式 | CSS Modules 或内联 CSS | 可爱风 UI 定制 |
| 图标 | 内联 SVG + CSS | 自定义可爱风标记和弹窗 |

## 核心组件设计

```
App
 └── MapPage
      ├── GoogleMap (地图容器)
      │    ├── CityCluster[]        (zoom < 13 时显示，自定义 OverlayView 圆形)
      │    └── CuteMarker[]         (zoom >= 13 或点击某条数据时显示)
      │         └── CuteInfoWindow  (鼠标悬停时的自定义 OverlayView 弹窗)
      └── SearchBox (悬浮输入框 + 下拉列表)
```

---

## Task 1: 初始化 Vite + React + TypeScript 项目

使用命令初始化项目并安装依赖：
```bash
npm create vite@latest . -- --template react-ts
npm install @react-google-maps/api
```

**API Key 配置**：在 `src/config.ts` 中存放 Key，通过环境变量或直接写入（后续可替换）。

---

## Task 2: 地图基础渲染 (`src/pages/MapPage.tsx`)

- 使用 `<LoadScript googleMapsApiKey={KEY} libraries={["places"]}>` 加载 SDK
- `<GoogleMap>` 配置：
  - `center`: `{ lat: 21.0285, lng: 105.8542 }` (河内)
  - `zoom`: 7, `minZoom`: 7, `maxZoom`: 19
  - 禁用默认 POI 点击（`styles` 隐藏 POI label）
- 监听 `onZoomChanged`，当 zoom >= 13 时触发显示标记逻辑

---

## Task 3: 悬浮搜索框 (`src/components/SearchBox.tsx`)

- 固定在页面左上角，CSS `position: absolute; z-index: 10`
- 使用 Google Places `AutocompleteService.getPlacePredictions()` 实现实时模糊搜索
  - 参数 `componentRestrictions: { country: 'vn' }` 限定越南范围
- 输入时防抖（300ms）调用 API，结果渲染在下拉列表中
- 每条结果显示：名称 + 地址描述
- 点击某条结果 → 地图 flyTo 该点坐标，并触发显示该点的可爱标记
- 搜索结果同时写入全局 state，供聚类逻辑使用

---

## Task 4: 城市聚类圆形 (`src/components/CityCluster.tsx`)

- **触发条件**：zoom < 13 且搜索结果不为空
- **聚类逻辑**：对搜索结果按 `city`（从 `address_components` 提取 `locality` 或 `administrative_area_level_1`）分组
- **渲染**：使用 `<OverlayView>` 将自定义 DOM 渲染在地图上
  - 圆形设计：渐变背景 + 城市名 + 白色描边
  - 鼠标移入：显示 tooltip（当前城市数据条数）
  - 点击圆形：地图缩放至该城市中心（zoom 13），展开显示该城市所有标记

---

## Task 5: 可爱风自定义标记 (`src/components/CuteMarker.tsx`)

- **触发条件**：zoom >= 13 或用户点击了搜索列表中的某条数据
- 使用 `<OverlayView>` 替代 Google Maps 默认 Marker
- 标记形状：内联 SVG，设计为可爱风地图钉（圆头 + 小尖底，粉色/橙色渐变，带小表情或爱心装饰）
- 支持鼠标 hover 状态切换（放大动画）

---

## Task 6: 可爱风悬浮信息窗口 (`src/components/CuteInfoWindow.tsx`)

- 同样使用 `<OverlayView>` 实现，不用 `google.maps.InfoWindow`
- 触发：鼠标移入 CuteMarker
- 样式：圆角卡片、柔和阴影、淡粉色背景、手写风格字体，顶部有小箭头指向标记
- 内容：地点名称（建筑/商店名）
- 移出标记时自动消失

---

## Task 7: 状态管理 & 数据流

- `MapPage` 统一管理状态：
  - `searchResults: PlaceResult[]` — 搜索返回的地点列表
  - `currentZoom: number` — 当前地图缩放级别
  - `selectedPlace: PlaceResult | null` — 点击选中的地点
  - `hoveredPlace: PlaceResult | null` — 鼠标悬停的地点
- 组件间通过 props 传递，无需额外状态库

---

## 文件结构

```
src/
├── config.ts                    # API Key 配置
├── types.ts                     # 类型定义
├── pages/
│   └── MapPage.tsx              # 主页面
├── components/
│   ├── SearchBox.tsx            # 搜索框
│   ├── CityCluster.tsx          # 城市聚类圆形
│   ├── CuteMarker.tsx           # 可爱标记
│   └── CuteInfoWindow.tsx       # 可爱信息窗口
└── utils/
    └── geoHelpers.ts            # 聚类计算、坐标转换工具函数
```

---

## 关键注意事项

1. **Places API 配额**：每次搜索请求返回最多 5 条预测，点击后需用 `PlacesService.getDetails()` 获取经纬度
2. **聚类圆形定位**：使用 `google.maps.OverlayView` 的 `fromLatLngToDivPixel` 将经纬度转为像素坐标
3. **可爱风 SVG**：标记和弹窗均用 React 组件 + CSS 实现，不依赖外部图片资源
4. **性能**：搜索结果超过 50 条时考虑虚拟列表或分批渲染
