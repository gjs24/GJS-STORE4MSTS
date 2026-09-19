package com.gjs.store.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "site_settings")
public class SiteSetting {

    @Id
    private Long id = 1L;

    @Column(name = "hero_image_url")
    private String heroImageUrl;

    @Column(name = "hero_image_alt", length = 180)
    private String heroImageAlt = "MSTS-GJS Production Store railway asset preview";

    @Column(name = "popup_enabled", nullable = false)
    private boolean popupEnabled = false;

    @Column(name = "popup_title", length = 120)
    private String popupTitle = "Welcome to MSTS-GJS Production Store";

    @Column(name = "popup_message", columnDefinition = "TEXT")
    private String popupMessage;

    @Column(name = "maintenance_mode", nullable = false)
    private boolean maintenanceMode = false;

    @Column(name = "maintenance_title", length = 200)
    private String maintenanceTitle = "System Under Scheduled Maintenance";

    @Column(name = "desktop_app_download_url")
    private String desktopAppDownloadUrl;

    @Column(name = "board_studio_enabled", nullable = false)
    private boolean boardStudioEnabled = true;

    @Column(name = "festival_theme_enabled", nullable = false)
    private boolean festivalThemeEnabled = false;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SiteSetting() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHeroImageUrl() { return heroImageUrl; }
    public void setHeroImageUrl(String heroImageUrl) { this.heroImageUrl = heroImageUrl; }

    public String getHeroImageAlt() { return heroImageAlt; }
    public void setHeroImageAlt(String heroImageAlt) { this.heroImageAlt = heroImageAlt; }

    public boolean isPopupEnabled() { return popupEnabled; }
    public void setPopupEnabled(boolean popupEnabled) { this.popupEnabled = popupEnabled; }

    public String getPopupTitle() { return popupTitle; }
    public void setPopupTitle(String popupTitle) { this.popupTitle = popupTitle; }

    public String getPopupMessage() { return popupMessage; }
    public void setPopupMessage(String popupMessage) { this.popupMessage = popupMessage; }

    public boolean isMaintenanceMode() { return maintenanceMode; }
    public void setMaintenanceMode(boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }

    public String getMaintenanceTitle() { return maintenanceTitle; }
    public void setMaintenanceTitle(String maintenanceTitle) { this.maintenanceTitle = maintenanceTitle; }

    public String getDesktopAppDownloadUrl() { return desktopAppDownloadUrl; }
    public void setDesktopAppDownloadUrl(String desktopAppDownloadUrl) { this.desktopAppDownloadUrl = desktopAppDownloadUrl; }

    public boolean isBoardStudioEnabled() { return boardStudioEnabled; }
    public void setBoardStudioEnabled(boolean boardStudioEnabled) { this.boardStudioEnabled = boardStudioEnabled; }

    public boolean isFestivalThemeEnabled() { return festivalThemeEnabled; }
    public void setFestivalThemeEnabled(boolean festivalThemeEnabled) { this.festivalThemeEnabled = festivalThemeEnabled; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
