package com.gjs.store.repository;

import com.gjs.store.entity.BoardTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardTemplateRepository extends JpaRepository<BoardTemplate, String> {

    List<BoardTemplate> findByPublishedTrueOrderByIsPaidAscNameAsc();

    List<BoardTemplate> findByCategoryAndPublishedTrue(String category);
}

