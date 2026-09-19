package com.gjs.store.dto;

import com.gjs.store.entity.BoardTemplate;

import java.math.BigDecimal;
import java.util.Map;

public class BoardDtos {

    public record QuickPresetDto(
        String id,
        String name,
        Map<String, String> values
    ) {}

    public record BoardTemplateDto(
        String id,
        String name,
        String category,
        String description,
        int baseWidth,
        int baseHeight,
        String bgImageUrl,
        String targetTextureName,
        boolean isPaid,
        BigDecimal price,
        boolean published,
        String fieldsJson,
        String quickPresetsJson,
        String variationsJson,
        boolean unlockedForCurrentUser
    ) {
        public static BoardTemplateDto fromEntity(BoardTemplate t, boolean unlocked) {
            return new BoardTemplateDto(
                t.getId(),
                t.getName(),
                t.getCategory(),
                t.getDescription(),
                t.getBaseWidth(),
                t.getBaseHeight(),
                t.getBgImageUrl(),
                t.getTargetTextureName(),
                t.isPaid(),
                t.getPrice(),
                t.isPublished(),
                t.getFields(),
                t.getQuickPresets(),
                t.getVariations(),
                unlocked
            );
        }
    }

    public record SaveCustomBoardRequest(
        String templateId,
        String title,
        String customFieldValuesJson,
        String previewImageUrl
    ) {}
}

