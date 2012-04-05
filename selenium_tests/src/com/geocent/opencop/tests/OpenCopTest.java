package com.geocent.opencop.tests;


import static org.junit.Assert.*;

import java.util.concurrent.TimeUnit;

import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;

public class OpenCopTest {
	private WebDriver driver;
	private String baseUrl;
	private StringBuffer verificationErrors = new StringBuffer();
	
	@Before
	public void setUp() throws Exception {
		driver = new FirefoxDriver();
		baseUrl = "http://localhost/";
		driver.manage().timeouts().implicitlyWait(30, TimeUnit.SECONDS);
	}

	@Test
	public void testOpenCopExists() throws Exception {
		driver.get("http://localhost/opencop");
		assertEquals("OpenCOP 2.0", driver.getTitle());
//		driver.findElement(By.id("ext-gen26")).click();
//		for (int second = 0;; second++) {
//			if (second >= 60) fail("timeout");
//			try { if (isElementPresent(By.cssSelector("div.x-grid3-cell-inner.x-grid3-col-0"))) break; } catch (Exception e) {}
//			Thread.sleep(1000);
//		}
//
//		// ERROR: Caught exception [ERROR: Unsupported command [doubleClickAt]]
//		driver.findElement(By.id("ext-gen181")).click();
//		assertEquals("example", driver.findElement(By.id("extdd-24")).getText());
	}

	@After
	public void tearDown() throws Exception {
		driver.quit();
		String verificationErrorString = verificationErrors.toString();
		if (!"".equals(verificationErrorString)) {
			fail(verificationErrorString);
		}
	}
	
	// Private methods:

//	private boolean isElementPresent(By by) {
//		try {
//			driver.findElement(by);
//			return true;
//		} catch (NoSuchElementException e) {
//			return false;
//		}
//	}
}