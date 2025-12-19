Feature: Auth-required access to application content

  As a Visitor
  I want to be redirected to login when not authenticated
  So that application content is only visible to authenticated users

  Scenario: Unidentified user sees the guest view
    When an unidentified user visits the site
    Then they see the guest view
