package hu.btphoto.profile.repository;

import java.util.UUID;

import hu.btphoto.profile.model.PhotographerBusiness;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotographerBusinessRepository extends JpaRepository<PhotographerBusiness, UUID> {
}
