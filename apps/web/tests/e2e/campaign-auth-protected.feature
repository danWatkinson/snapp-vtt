Feature: World Builders can create campaigns

  As a World Builder
  I want to create campaigns
  So that a game master and their players can play them

  Background:
    Given there is a world builder

  Scenario: World builder can create a campaign
    When the world builder creates a campaign
    Then the campaign appears in the campaigns list
