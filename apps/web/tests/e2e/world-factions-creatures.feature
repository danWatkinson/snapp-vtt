Feature: World builder assigns creatures as members of factions

  As a World Builder
  I Want to assign zero-or-more creatures as members of factions
  So That I can create a believable world

  Background:
    Given there is an admin user

  Scenario: World builder can assign creatures as members of a faction
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with factions tab
    And the admin ensures faction "Thieves Guild" exists
    And the admin ensures creature "Rogar" exists
    And the admin ensures creature "Lila" exists
    And the admin links creature "Rogar" as member of "Thieves Guild"
    And the admin links creature "Lila" as member of "Thieves Guild"
    Then faction "Thieves Guild" shows it has member "Rogar"
    And faction "Thieves Guild" shows it has member "Lila"

  Scenario: World builder can assign creatures to nested factions
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with factions tab
    And the admin ensures faction "Thieves Guild" exists
    And the admin creates faction "Honourable Thieves"
    And the admin links faction "Honourable Thieves" as sub-faction of "Thieves Guild"
    And the admin ensures creature "Val" exists
    And the admin links creature "Val" as member of "Honourable Thieves"
    Then faction "Honourable Thieves" shows it has member "Val"
    And faction "Thieves Guild" shows it has sub-faction "Honourable Thieves"
    And faction "Honourable Thieves" shows it is part of "Thieves Guild"

  Scenario: World builder can view members when viewing a faction
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with factions tab
    And the admin ensures faction "Wizards Council" exists
    And the admin ensures creature "Merlin" exists
    And the admin ensures creature "Gandalf" exists
    And the admin links creature "Merlin" as member of "Wizards Council"
    And the admin links creature "Gandalf" as member of "Wizards Council"
    And the admin views faction "Wizards Council"
    Then faction "Wizards Council" displays members:
      | Merlin |
      | Gandalf |
