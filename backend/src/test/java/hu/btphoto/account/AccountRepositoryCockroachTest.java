package hu.btphoto.account;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import hu.btphoto.account.model.AppUser;
import hu.btphoto.account.model.SystemAdmin;
import hu.btphoto.account.repository.AppUserRepository;
import hu.btphoto.account.repository.SystemAdminRepository;
import hu.btphoto.profile.model.PhotographerProfile;
import hu.btphoto.profile.repository.PhotographerProfileRepository;
import hu.btphoto.workspace.model.PhotographerWorkspace;
import hu.btphoto.workspace.repository.PhotographerWorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataAccessException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "BTPHOTO_TEST_JDBC_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/btphoto\\?sslmode=disable")
@EnabledIfEnvironmentVariable(named = "BTPHOTO_TEST_FIXTURE", matches = "ephemeral-cockroach26")
class AccountRepositoryCockroachTest {
    @Autowired
    AppUserRepository users;
    @Autowired
    SystemAdminRepository operators;
    @Autowired
    PhotographerWorkspaceRepository workspaces;
    @Autowired
    PhotographerProfileRepository profiles;
    @Autowired
    PlatformTransactionManager transactions;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("BTPHOTO_TEST_JDBC_URL"));
        registry.add("spring.datasource.username", () -> System.getenv("BTPHOTO_TEST_DB_USERNAME"));
        registry.add("spring.datasource.password", () -> System.getenv("BTPHOTO_TEST_DB_PASSWORD"));
    }

    private AppUser account() {
        UUID id = UUID.randomUUID();
        var now = Instant.now();
        return new AppUser(id, "fixture-" + id, id + "@fixture.test", "not-an-authentication-hash", true, now, now);
    }

    @Test
    void persistsTwoRealProfilesAndQueriesOnlyMatchingOwnerAndWorkspace() {
        var first = users.saveAndFlush(account());
        var second = users.saveAndFlush(account());
        var one = workspaces.saveAndFlush(new PhotographerWorkspace(UUID.randomUUID(), first.getId(), Instant.now()));
        var two = workspaces.saveAndFlush(new PhotographerWorkspace(UUID.randomUUID(), second.getId(), Instant.now()));
        profiles.saveAndFlush(profile(first.getId(), one.getId(), "Első"));
        profiles.saveAndFlush(profile(second.getId(), two.getId(), "Második"));
        assertTrue(profiles.findByUserIdAndWorkspaceId(first.getId(), one.getId()).isPresent());
        assertTrue(profiles.findByUserIdAndWorkspaceId(second.getId(), two.getId()).isPresent());
        assertFalse(profiles.findByUserIdAndWorkspaceId(first.getId(), two.getId()).isPresent());
    }

    @Test
    void compositeConstraintRejectsProfileInAnotherOwnersWorkspace() {
        var first = users.saveAndFlush(account());
        var second = users.saveAndFlush(account());
        var foreign = workspaces.saveAndFlush(
                new PhotographerWorkspace(UUID.randomUUID(), second.getId(), Instant.now()));
        assertThrows(DataAccessException.class, () -> profiles.saveAndFlush(
                profile(first.getId(), foreign.getId(), "Tiltott")));
    }

    @Test
    void duplicateNormalizedEmailIsRejectedInDatabase() {
        var first = users.saveAndFlush(account());
        var now = Instant.now();
        var duplicate = new AppUser(UUID.randomUUID(), "duplicate-" + UUID.randomUUID(),
                first.getEmail(), "not-an-authentication-hash", false, now, now);
        assertThrows(DataAccessException.class, () -> users.saveAndFlush(duplicate));
    }

    @Test
    void approvalChangesStatusAndActiveAtomicallyAndOnlyOnce() {
        var admin = users.saveAndFlush(account());
        var now = Instant.now();
        var user = users.saveAndFlush(new AppUser(UUID.randomUUID(), "pending-" + UUID.randomUUID(),
                UUID.randomUUID() + "@fixture.test", "not-an-authentication-hash", false, now, now));
        assertEquals(1, users.decidePending(user.getId(), hu.btphoto.account.model.ApprovalStatus.APPROVED,
                true, now, admin.getId(), hu.btphoto.account.model.ApprovalStatus.PENDING));
        var updated = users.findById(user.getId()).orElseThrow();
        assertTrue(updated.isActive());
        assertEquals(hu.btphoto.account.model.ApprovalStatus.APPROVED, updated.getApprovalStatus());
        assertEquals(admin.getId(), updated.getApprovedBy());
        assertEquals(0, users.decidePending(user.getId(), hu.btphoto.account.model.ApprovalStatus.REJECTED,
                false, now, admin.getId(), hu.btphoto.account.model.ApprovalStatus.PENDING));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentProvisioningCannotCreateTwoOperators() throws Exception {
        assertEquals(0, operators.count(), "A teszt kizárólag üres, eldobható fixture-ben futhat.");
        var tx = new TransactionTemplate(transactions);
        var first = account();
        var second = account();
        tx.executeWithoutResult(status -> {
            users.saveAndFlush(first);
            users.saveAndFlush(second);
        });
        try {
            assertEquals(1, parallel(() -> insertOperator(tx, first.getId()),
                    () -> insertOperator(tx, second.getId())));
            assertEquals(1, operators.count());
        } finally {
            tx.executeWithoutResult(status -> {
                operators.deleteById((short) 1);
                users.deleteById(first.getId());
                users.deleteById(second.getId());
            });
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void initialPasswordConsumptionHasOneConcurrentWinner() throws Exception {
        assertEquals(0, operators.count(), "A teszt kizárólag üres, eldobható fixture-ben futhat.");
        var tx = new TransactionTemplate(transactions);
        var user = account();
        tx.executeWithoutResult(status -> {
            users.saveAndFlush(user);
            operators.saveAndFlush(new SystemAdmin(user.getId(), true));
        });
        try {
            var task = (Callable<Integer>) () -> {
                try {
                    Integer result = tx.execute(status ->
                            operators.consumeInitialPassword(user.getId(), Instant.now()));
                    return result == null ? 0 : result;
                } catch (DataAccessException exception) {
                    return 0;
                }
            };
            assertEquals(1, parallel(task, task));
            assertTrue(operators.findById((short) 1).orElseThrow().getInitialPasswordUsedAt() != null);
        } finally {
            tx.executeWithoutResult(status -> {
                operators.deleteById((short) 1);
                users.deleteById(user.getId());
            });
        }
    }

    private int insertOperator(TransactionTemplate tx, UUID id) {
        try {
            tx.executeWithoutResult(status -> operators.saveAndFlush(new SystemAdmin(id, true)));
            return 1;
        } catch (DataAccessException | org.springframework.transaction.TransactionException exception) {
            return 0;
        }
    }

    private int parallel(Callable<Integer> first, Callable<Integer> second) throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = List.of(first, second).stream().map(task -> executor.submit(() -> {
                ready.countDown();
                if (!start.await(5, TimeUnit.SECONDS)) { throw new IllegalStateException("Fixture időkorlát."); }
                return task.call();
            })).toList();
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            return futures.get(0).get(20, TimeUnit.SECONDS) + futures.get(1).get(20, TimeUnit.SECONDS);
        } finally {
            start.countDown();
        }
    }

    private PhotographerProfile profile(UUID user, UUID workspace, String name) {
        return new PhotographerProfile(user, workspace, name, "Fotós", "", "", "", null, null, null);
    }
}
