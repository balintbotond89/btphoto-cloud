package hu.btphoto.account.service;

import hu.btphoto.account.repository.AppUserRepository;
import hu.btphoto.account.repository.SystemAdminRepository;
import hu.btphoto.exception.ApiProblem;
import hu.btphoto.profile.repository.PhotographerBusinessRepository;
import hu.btphoto.profile.repository.PhotographerProfileRepository;
import hu.btphoto.workspace.repository.PhotographerWorkspaceRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AccountStore {
    private final ObjectProvider<AppUserRepository> users;
    private final ObjectProvider<SystemAdminRepository> operators;
    private final ObjectProvider<PhotographerWorkspaceRepository> workspaces;
    private final ObjectProvider<PhotographerProfileRepository> profiles;
    private final ObjectProvider<PhotographerBusinessRepository> businesses;

    public AccountStore(ObjectProvider<AppUserRepository> users, ObjectProvider<SystemAdminRepository> operators,
            ObjectProvider<PhotographerWorkspaceRepository> workspaces,
            ObjectProvider<PhotographerProfileRepository> profiles,
            ObjectProvider<PhotographerBusinessRepository> businesses) {
        this.users = users;
        this.operators = operators;
        this.workspaces = workspaces;
        this.profiles = profiles;
        this.businesses = businesses;
    }

    private <T> T require(ObjectProvider<T> provider) {
        T repository = provider.getIfAvailable();
        if (repository == null) {
            throw new ApiProblem(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                    "A szolgáltatás átmenetileg nem érhető el.");
        }
        return repository;
    }

    public AppUserRepository users() { return require(users); }
    public SystemAdminRepository operators() { return require(operators); }
    public PhotographerWorkspaceRepository workspaces() { return require(workspaces); }
    public PhotographerProfileRepository profiles() { return require(profiles); }
    public PhotographerBusinessRepository businesses() { return require(businesses); }
}
