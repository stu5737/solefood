//
//  FoodDropAnnotationView.swift
//  SolefoodMVP
//
//  美食卸貨地圖 — 餐廳標註視圖（Q 版果凍膠囊風格）
//  錨點為底部三角形尖點，放置於 Mapbox 座標時精準指向該點。
//

import UIKit

/// 自訂地圖標註視圖：發光果凍膠囊 + 餐廳名稱 + 底部指針。
/// 錨點 (anchorPoint) 設為底部中心，使三角形尖點對齊地圖座標。
final class FoodDropAnnotationView: UIView {

    // MARK: - Subviews

    /// 膠囊背景圖（圓潤、發光、橙紅漸層）
    private let backgroundImageView: UIImageView = {
        let iv = UIImageView()
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        return iv
    }()

    /// 餐廳名稱標籤（圓潤粗體、白色）
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = UIFont.systemFont(ofSize: 14, weight: .heavy)
        if let descriptor = label.font.fontDescriptor.withDesign(.rounded) {
            label.font = UIFont(descriptor: descriptor, size: 14)
        }
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 1
        label.lineBreakMode = .byTruncatingTail
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.7
        return label
    }()

    /// 底部指針（倒三角形）— 用 CAShapeLayer 繪製
    private let pointerLayer: CAShapeLayer = {
        let layer = CAShapeLayer()
        layer.fillColor = UIColor.systemOrange.cgColor
        return layer
    }()

    // MARK: - Constants

    /// 膠囊與文字的水平邊距
    private let horizontalPadding: CGFloat = 12
    /// 膠囊與文字的垂直邊距
    private let verticalPadding: CGFloat = 8
    /// 底部指針高度（三角形）
    private let pointerHeight: CGFloat = 8
    /// 指針底邊寬度
    private let pointerWidth: CGFloat = 12

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }

    private func setupView() {
        // 1. 設定錨點：底部中心為錨點，使三角形尖點對齊地圖座標
        layer.anchorPoint = CGPoint(x: 0.5, y: 1.0)

        // 2. 背景圖
        if let image = UIImage(named: "jelly_pill_background") {
            backgroundImageView.image = image
        } else {
            // 若尚無素材，用圓角矩形 + 漸層色代替
            backgroundImageView.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.9)
        }
        addSubview(backgroundImageView)

        // 3. 輕微陰影，讓標註浮在地圖上
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowRadius = 4
        layer.shadowOpacity = 0.25

        // 4. 文字
        addSubview(titleLabel)

        setupConstraints()

        // 5. 底部指針（加入 layer，置於背景之上，路徑在 layoutSubviews 更新）
        layer.insertSublayer(pointerLayer, above: backgroundImageView.layer)
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // 背景：貼滿 view，但底部留出指針高度
            backgroundImageView.topAnchor.constraint(equalTo: topAnchor),
            backgroundImageView.leadingAnchor.constraint(equalTo: leadingAnchor),
            backgroundImageView.trailingAnchor.constraint(equalTo: trailingAnchor),
            backgroundImageView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -pointerHeight),

            // 文字：置中，左右留邊距
            titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: horizontalPadding),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -horizontalPadding),
            titleLabel.centerYAnchor.constraint(equalTo: backgroundImageView.centerYAnchor),
        ])
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        updatePointerPath()
        // 膠囊圓角（若用程式繪製背景時可用）
        backgroundImageView.layer.cornerRadius = min(backgroundImageView.bounds.height, backgroundImageView.bounds.width) / 2
    }

    /// 繪製底部倒三角形，尖點在 view 最下方中心（即錨點）
    private func updatePointerPath() {
        guard bounds.width > 0, bounds.height > pointerHeight else { return }
        let w = bounds.width
        let pillBottom = bounds.height - pointerHeight
        let cx = w / 2
        let path = UIBezierPath()
        path.move(to: CGPoint(x: cx - pointerWidth / 2, y: pillBottom))
        path.addLine(to: CGPoint(x: cx + pointerWidth / 2, y: pillBottom))
        path.addLine(to: CGPoint(x: cx, y: bounds.height))
        path.close()
        pointerLayer.path = path.cgPath
        pointerLayer.frame = bounds
    }

    // MARK: - Public API

    /// 設定餐廳名稱（例：「麥當勞 - 台北店」）
    /// 文字會依內容自適應，並限制在膠囊內，過長會截斷
    func setRestaurantName(_ name: String?) {
        titleLabel.text = name ?? ""
    }

    /// 取得當前餐廳名稱
    var restaurantName: String? {
        titleLabel.text
    }

    /// 建議尺寸：依文字內容估算寬高，供 Mapbox 建立 annotation 時使用
    static func preferredSize(for restaurantName: String?, maxWidth: CGFloat = 200) -> CGSize {
        let font = UIFont.systemFont(ofSize: 14, weight: .heavy)
        let descriptor = font.fontDescriptor.withDesign(.rounded) ?? font.fontDescriptor
        let roundedFont = UIFont(descriptor: descriptor, size: 14)
        let padding: CGFloat = 12 * 2
        let pointerH: CGFloat = 8
        let verticalPad: CGFloat = 8 * 2

        let text = restaurantName ?? ""
        let size = (text as NSString).size(withAttributes: [.font: roundedFont])
        let width = min(size.width + padding, maxWidth)
        let height = size.height + verticalPad + pointerH
        return CGSize(width: width, height: height)
    }
}
