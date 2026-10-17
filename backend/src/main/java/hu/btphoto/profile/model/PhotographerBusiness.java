package hu.btphoto.profile.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "photographer_business")
public class PhotographerBusiness {
    @Id
    @Column(name = "user_id")
    private UUID userId;
    @Column(name = "business_type", nullable = false, length = 32)
    private String businessType;
    @Column(name = "business_name", nullable = false, length = 200)
    private String businessName;
    @Column(name = "tax_number", nullable = false, length = 32)
    private String taxNumber;
    @Column(name = "registration_number", length = 32)
    private String registrationNumber;
    @Column(name = "address_json", nullable = false, columnDefinition = "text")
    private String addressJson;

    protected PhotographerBusiness() {
    }

    public PhotographerBusiness(UUID userId, String type, String name, String taxNumber,
            String registrationNumber, String addressJson) {
        this.userId = userId;
        this.businessType = type;
        this.businessName = name;
        this.taxNumber = taxNumber;
        this.registrationNumber = registrationNumber;
        this.addressJson = addressJson;
    }

    public UUID getUserId() { return userId; }
    public String getBusinessType() { return businessType; }
    public String getBusinessName() { return businessName; }
    public String getTaxNumber() { return taxNumber; }
    public String getRegistrationNumber() { return registrationNumber; }
    public String getAddressJson() { return addressJson; }
}
