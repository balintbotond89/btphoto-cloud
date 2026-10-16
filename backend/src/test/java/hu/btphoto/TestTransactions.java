package hu.btphoto;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

@TestConfiguration
@EnableTransactionManagement
public class TestTransactions {
    @Bean
    PlatformTransactionManager transactionManager() {
        return new AbstractPlatformTransactionManager() {
            private static final long serialVersionUID = 1L;
            @Override
            protected Object doGetTransaction() { return new Object(); }
            @Override
            protected void doBegin(Object transaction, TransactionDefinition definition) { }
            @Override
            protected void doCommit(DefaultTransactionStatus status) { }
            @Override
            protected void doRollback(DefaultTransactionStatus status) { }
        };
    }
}
