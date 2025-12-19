Feature: Game master creates scenes within a session

  As a Game Master
  I want to create scenes within sessions
  So that I can organize gameplay into discrete narrative moments

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master can create a Scene within a Session
    When the admin signs in to the system as "admin"
    And the campaign "Rise of the Dragon King" exists with sessions view
    And session "Session 1" exists in the campaign
    And the admin views scenes for session "Session 1"
    And the admin ensures scene "The Throne Room" exists in the session
    Then scene "The Throne Room" appears in the scenes list
