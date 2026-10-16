package hu.btphoto.profile.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "photographer_profile")
public class PhotographerProfile {
    @Id
    @Column(name = "user_id")
    private UUID userId;
    @Column(name = "workspace_id", nullable = false, unique = true)
    private UUID workspaceId;
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @Column(length = 24)
    private String salutation;
    @Column(length = 32)
    private String phone;
    @Column(length = 32)
    private String mobile;
    @Column(name = "home_address_json", columnDefinition = "text")
    private String homeAddressJson;
    @Column(name = "site_address_json", columnDefinition = "text")
    private String siteAddressJson;
    @Column(name = "avatar_path", length = 255)
    private String avatarPath;

    protected PhotographerProfile() {
    }

    public PhotographerProfile(UUID userId, UUID workspaceId, String lastName, String firstName,
            String salutation, String phone, String mobile, String homeAddressJson,
            String siteAddressJson, String avatarPath) {
        this.userId = userId;
        this.workspaceId = workspaceId;
        this.lastName = lastName;
        this.firstName = firstName;
        this.salutation = salutation;
        this.phone = phone;
        this.mobile = mobile;
        this.homeAddressJson = homeAddressJson;
        this.siteAddressJson = siteAddressJson;
        this.avatarPath = avatarPath;
    }

    public UUID getUserId() { return userId; }
    public UUID getWorkspaceId() { return workspaceId; }
    public String getLastName() { return lastName; }
    public String getFirstName() { return firstName; }
    public String getSalutation() { return salutation; }
    public String getPhone() { return phone; }
    public String getMobile() { return mobile; }
    public String getHomeAddressJson() { return homeAddressJson; }
    public String getSiteAddressJson() { return siteAddressJson; }
    public String getAvatarPath() { return avatarPath; }
}
