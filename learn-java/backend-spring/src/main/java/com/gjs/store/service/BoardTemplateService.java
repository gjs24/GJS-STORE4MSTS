package com.gjs.store.service;

import com.gjs.store.dto.BoardDtos.*;
import com.gjs.store.entity.BoardTemplate;
import com.gjs.store.entity.Role;
import com.gjs.store.entity.User;
import com.gjs.store.entity.UserCustomBoard;
import com.gjs.store.exception.BadRequestException;
import com.gjs.store.exception.ResourceNotFoundException;
import com.gjs.store.repository.BoardTemplateRepository;
import com.gjs.store.repository.UserBoardUnlockRepository;
import com.gjs.store.repository.UserCustomBoardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BoardTemplateService {

    private final BoardTemplateRepository templateRepository;
    private final UserBoardUnlockRepository unlockRepository;
    private final UserCustomBoardRepository customBoardRepository;

    public BoardTemplateService(
            BoardTemplateRepository templateRepository,
            UserBoardUnlockRepository unlockRepository,
            UserCustomBoardRepository customBoardRepository) {
        this.templateRepository = templateRepository;
        this.unlockRepository = unlockRepository;
        this.customBoardRepository = customBoardRepository;
    }

    @Transactional(readOnly = true)
    public List<BoardTemplateDto> getAllTemplates(User currentUser) {
        return templateRepository.findByPublishedTrueOrderByIsPaidAscNameAsc().stream()
                .map(t -> BoardTemplateDto.fromEntity(t, isUnlocked(t, currentUser)))
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardTemplateDto getTemplateById(String templateId, User currentUser) {
        BoardTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Board template not found: " + templateId));
        return BoardTemplateDto.fromEntity(template, isUnlocked(template, currentUser));
    }

    @Transactional
    public BoardTemplateDto updateQuickPresets(String templateId, String quickPresetsJson) {
        BoardTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Board template not found: " + templateId));

        template.setQuickPresets(quickPresetsJson);
        BoardTemplate saved = templateRepository.save(template);
        return BoardTemplateDto.fromEntity(saved, true);
    }

    @Transactional
    public Long saveUserCustomBoard(SaveCustomBoardRequest req, User user) {
        BoardTemplate template = templateRepository.findById(req.templateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + req.templateId()));

        if (!isUnlocked(template, user)) {
            throw new BadRequestException("You must unlock this template before saving custom configurations");
        }

        UserCustomBoard customBoard = UserCustomBoard.builder()
                .user(user)
                .template(template)
                .title(req.title() != null ? req.title().trim() : "My Custom Board")
                .customFieldValues(req.customFieldValuesJson())
                .previewImageUrl(req.previewImageUrl())
                .build();

        return customBoardRepository.save(customBoard).getId();
    }

    @Transactional(readOnly = true)
    public List<UserCustomBoard> getUserCustomBoards(User user) {
        return customBoardRepository.findByUserOrderBySavedAtDesc(user);
    }

    private boolean isUnlocked(BoardTemplate template, User user) {
        if (!template.isPaid()) {
            return true;
        }
        if (user == null) {
            return false;
        }
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_MODERATOR) {
            return true;
        }
        return unlockRepository.existsByUserAndTemplate(user, template);
    }
}

