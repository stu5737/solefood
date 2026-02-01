# 🍽️ FoodDropAnnotationView 使用範例（含 GPX 座標）

## 1. 初始化與設定餐廳名稱

```swift
// 依建議尺寸建立 view（或自訂 frame）
let size = FoodDropAnnotationView.preferredSize(for: "麥當勞 - 台北店", maxWidth: 200)
let annotationView = FoodDropAnnotationView(frame: CGRect(origin: .zero, size: size))
annotationView.setRestaurantName("麥當勞 - 台北店")
```

## 2. 錨點說明（重要）

`FoodDropAnnotationView` 已將 `layer.anchorPoint` 設為 `(0.5, 1.0)`，即**底部中心**為錨點。  
當你將此 view 的 **center** 設為地圖上某座標對應的螢幕點時，**三角形尖點**會對齊該點，標註會精準指向該路口／餐廳。

- Mapbox：若使用 `MGLAnnotationView`，將 annotation view 的 `center` 設為該座標轉成螢幕點即可。
- 若 SDK 支援「錨點偏移」，可設為 `(0.5, 1.0)` 對應底部中心。

## 3. 在您提供的 GPX 座標上設計／預覽

以下為您 GPX 中的代表座標（台灣，約 22.53°N, 120.96°E），可用於在地圖上放置一個「麥當勞 - 台北店」範例標註：

| 用途     | 緯度 (lat)  | 經度 (lon)   |
|----------|-------------|--------------|
| 起點     | 22.531548   | 120.967278   |
| 中段     | 22.531733   | 120.967079   |
| 後段     | 22.531534   | 120.967140   |

### 範例：在 Mapbox iOS (MGLMapView) 上加入一個標註

```swift
// 假設已有 mapView: MGLMapView

// 1. 自訂 Annotation 類別（實作 MGLAnnotation）
class RestaurantPoint: NSObject, MGLAnnotation {
    var coordinate: CLLocationCoordinate2D
    var title: String?
    var subtitle: String?

    init(coordinate: CLLocationCoordinate2D, title: String?) {
        self.coordinate = coordinate
        self.title = title
        super.init()
    }
}

// 2. 在 GPX 起點座標建立一個餐廳點
let gpxStart = CLLocationCoordinate2D(latitude: 22.531548, longitude: 120.967278)
let annotation = RestaurantPoint(coordinate: gpxStart, title: "麥當勞 - 台北店")
mapView.addAnnotation(annotation)

// 3. 在 MGLMapViewDelegate 中回傳自訂 View
// 注意：Mapbox 需回傳 MGLAnnotationView。若專案已加入 Mapbox iOS SDK，
// 可將 FoodDropAnnotationView 改為繼承 MGLAnnotationView，或將本 view 包在 MGLAnnotationView 內當作 content。
func mapView(_ mapView: MGLMapView, viewFor annotation: MGLAnnotation) -> MGLAnnotationView? {
    guard let restaurant = annotation as? RestaurantPoint else { return nil }
    let reuseId = "FoodDrop"
    var view = mapView.dequeueReusableAnnotationView(withIdentifier: reuseId)
    if view == nil {
        let size = FoodDropAnnotationView.preferredSize(for: restaurant.title, maxWidth: 200)
        let foodView = FoodDropAnnotationView(frame: CGRect(origin: .zero, size: size))
        view = MGLAnnotationView(reuseIdentifier: reuseId)
        view?.bounds = CGRect(origin: .zero, size: size)
        view?.addSubview(foodView)
        // 讓膠囊底部尖點對齊 annotation view 中心（Mapbox 會把中心放在座標上）
        foodView.center = CGPoint(x: size.width / 2, y: 0)
    }
    if let foodView = view?.subviews.first as? FoodDropAnnotationView {
        foodView.setRestaurantName(restaurant.title)
    }
    return view
}
```

## 4. 素材準備

- 將**果凍膠囊背景圖**加入 Asset Catalog，命名為 `jelly_pill_background`。  
- 若尚未有圖，`FoodDropAnnotationView` 會以圓角矩形 + 橙底代替，指針仍會正常顯示。

## 5. 在指定座標上「設計看看」的檢查清單

- [ ] 在 Xcode 中已加入 `FoodDropAnnotationView.swift` 並編譯通過  
- [ ] 在 Mapbox 地圖上於 `(22.531548, 120.967278)` 加入一個 `FoodDropAnnotationView`  
- [ ] 確認標註**尖點**對齊該座標，沒有浮在半空  
- [ ] 確認文字「麥當勞 - 台北店」在膠囊內可讀、有留邊距  
- [ ] （可選）加入 `jelly_pill_background` 後檢查發光／陰影效果  

完成以上步驟即可在您提供的 GPX 座標上驗證設計與對齊效果。
